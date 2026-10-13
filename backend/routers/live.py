"""Live timing WebSocket endpoint.

Streams real-time F1 timing data to connected clients.
Uses the test replayer for development (when test data exists locally)
and the real SignalR client for production (live sessions).
"""

import asyncio
import logging
import os

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query

logger = logging.getLogger(__name__)
router = APIRouter(tags=["live"])

# Shared live session state
_live_sessions: dict[str, "LiveSession"] = {}


class LiveSession:
    """Manages a single live timing session with fan-out to multiple clients."""

    def __init__(self, key: str, session_type: str):
        self.key = key
        self.session_type = session_type
        self.clients: list[WebSocket] = []
        self._state_manager = None
        self._replayer = None
        self._signalr_client = None
        self._task: asyncio.Task | None = None
        self._started = False
        self._mode = "none"  # "replayer" or "signalr"
        self._msg_logged = False
        
        # DVR Buffer for SignalR
        self._signalr_messages = []
        self._playback_index = 0
        self._is_paused = False
        self._first_timestamp = 0.0
        self._target_time = 0.0
        self._playback_speed = 1.0
        self._last_process_time = 0.0

    async def start(
        self,
        year: int = 0,
        round_num: int = 0,
        data_dir: str | None = None,
        speed: float = 10.0,
        use_signalr: bool = False,
    ):
        """Start the live session."""
        if self._started:
            return

        from services.live_state import LiveStateManager
        from services.storage import get_json

        pit_loss_green = 0.0
        pit_loss_sc = 0.0
        pit_loss_vsc = 0.0
        is_race = self.session_type in ("R", "S")

        if is_race:
            pit_data = get_json("pit_loss.json")
            if pit_data:
                ga = pit_data.get("global_averages", {})
                pit_loss_green = ga.get("green", 22.0)
                pit_loss_sc = ga.get("sc", 10.0)
                pit_loss_vsc = ga.get("vsc", 14.5)

        track_norm = None
        track_points = None
        if year and round_num:
            track_data = _find_track_data(year, round_num, self.session_type)
            if track_data:
                track_norm = track_data.get("norm")
                track_points = track_data.get("track_points")
                if track_norm and track_points:
                    logger.info(f"Loaded track data for live session {year}/{round_num}/{self.session_type}: "
                                f"{len(track_points)} points, norm={track_norm}")

        self._init_state_manager(pit_loss_green, pit_loss_sc, pit_loss_vsc, track_norm, track_points)

        if data_dir:
            from services.live_test_replayer import LiveTestReplayer
            self._replayer = LiveTestReplayer(data_dir, speed_multiplier=speed)
            self._replayer.load()
            self._task = asyncio.create_task(self._run_replayer())
            self._mode = "replayer"
        elif use_signalr:
            from services.live_signalr import LiveSignalRClient
            self._signalr_client = LiveSignalRClient()
            self._task = asyncio.create_task(self._run_signalr())
            self._playback_task = asyncio.create_task(self._dvr_playback_loop())
            self._mode = "signalr"

        self._started = True
        logger.info(f"Live session started: {self.key} (mode={self._mode})")

    def _init_state_manager(self, pit_loss_green=0.0, pit_loss_sc=0.0, pit_loss_vsc=0.0, track_norm=None, track_points=None):
        from services.live_state import LiveStateManager
        self._state_manager = LiveStateManager(
            session_type=self.session_type,
            pit_loss_green=pit_loss_green,
            pit_loss_sc=pit_loss_sc,
            pit_loss_vsc=pit_loss_vsc,
            track_norm=track_norm,
            track_points=track_points,
        )

    async def _run_replayer(self):
        try:
            await self._replayer.replay(self._on_message)
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Replayer error: {e}")

    async def _run_signalr(self):
        try:
            await self._signalr_client.connect(self._on_signalr_message)
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"SignalR error: {e}")

    async def _on_signalr_message(self, topic: str, data: dict, timestamp: float):
        if not self._msg_logged:
            logger.info(f"First SignalR message received: topic={topic}")
            self._msg_logged = True
            self._first_timestamp = timestamp
            self._last_process_time = asyncio.get_event_loop().time()
        
        # Buffer the message continuously
        self._signalr_messages.append((topic, data, timestamp))

    async def _dvr_playback_loop(self):
        # Background task that feeds messages from the buffer to the state manager
        try:
            while True:
                await asyncio.sleep(0.05)
                
                if self._is_paused or not self._signalr_messages:
                    self._last_process_time = asyncio.get_event_loop().time()
                    continue

                now = asyncio.get_event_loop().time()
                dt = now - self._last_process_time
                self._last_process_time = now

                # Advance target time
                self._target_time += dt * self._playback_speed

                # Process messages up to the target time
                while self._playback_index < len(self._signalr_messages):
                    msg = self._signalr_messages[self._playback_index]
                    msg_rel_time = msg[2] - self._first_timestamp
                    
                    if msg_rel_time <= self._target_time:
                        try:
                            self._state_manager.process_message(msg[0], msg[1], msg[2])
                        except Exception as e:
                            logger.error(f"DVR message processing error: {e}")
                        self._playback_index += 1
                    else:
                        break

        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"DVR playback loop error: {e}")

    async def _on_message(self, topic: str, data: dict, timestamp: float):
        try:
            self._state_manager.process_message(topic, data, timestamp)
        except Exception as e:
            logger.error(f"Message processing error: {e}")

    def get_frame(self) -> dict | None:
        if self._state_manager is None:
            return None
        frame = self._state_manager.get_frame()
        # For SignalR, override totalTime so the scrubber knows the max buffer size
        if self._mode == "signalr" and self._signalr_messages:
            frame["totalTime"] = self._signalr_messages[-1][2] - self._first_timestamp
            frame["timestamp"] = min(self._target_time, frame["totalTime"])
        return frame

    def set_playback(self, paused: bool, speed: float):
        self._is_paused = paused
        self._playback_speed = speed
        self._last_process_time = asyncio.get_event_loop().time()

    def skip_forward(self, seconds: float):
        if self._mode == "signalr":
            self.seek(self._target_time + seconds)
        elif self._replayer and self._replayer._messages:
            current_ts = self._replayer._messages[self._replayer._current_index].timestamp
            self.seek(current_ts + seconds)

    def seek(self, target_ts: float):
        if self._mode == "signalr":
            if not self._signalr_messages:
                return
            
            target_rel_time = max(0.0, min(target_ts, self._signalr_messages[-1][2] - self._first_timestamp))
            self._target_time = target_rel_time
            
            # Find new index based on relative time
            new_idx = 0
            for i, msg in enumerate(self._signalr_messages):
                if (msg[2] - self._first_timestamp) > target_rel_time:
                    break
                new_idx = i

            if new_idx < self._playback_index:
                # Rebuild state from scratch
                self._init_state_manager(
                    self._state_manager._pit_loss_green,
                    self._state_manager._pit_loss_sc,
                    self._state_manager._pit_loss_vsc,
                    self._state_manager._track_norm,
                    [{"x": float(row[0]), "y": float(row[1])} for row in self._state_manager._track_xy] if self._state_manager._track_xy is not None else None,
                )
                for i in range(new_idx):
                    msg = self._signalr_messages[i]
                    try:
                        self._state_manager.process_message(msg[0], msg[1], msg[2])
                    except Exception:
                        pass
            else:
                # Fast forward
                for i in range(self._playback_index, new_idx):
                    msg = self._signalr_messages[i]
                    try:
                        self._state_manager.process_message(msg[0], msg[1], msg[2])
                    except Exception:
                        pass
            
            self._playback_index = new_idx
            logger.info(f"SignalR DVR Seeked to {target_rel_time:.1f}s (idx {new_idx})")

        elif self._mode == "replayer" and self._replayer and self._replayer._messages:
            replayer = self._replayer
            lo, hi = 0, len(replayer._messages)
            while lo < hi:
                mid = (lo + hi) // 2
                if replayer._messages[mid].timestamp < target_ts:
                    lo = mid + 1
                else:
                    hi = mid
            target_idx = lo

            if target_idx > replayer._current_index:
                idx = replayer._current_index
                while idx < target_idx:
                    msg = replayer._messages[idx]
                    self._state_manager.process_message(msg.topic, msg.data, msg.timestamp)
                    idx += 1
            else:
                self._init_state_manager(
                    self._state_manager._pit_loss_green,
                    self._state_manager._pit_loss_sc,
                    self._state_manager._pit_loss_vsc,
                    self._state_manager._track_norm,
                    [{"x": float(row[0]), "y": float(row[1])} for row in self._state_manager._track_xy] if self._state_manager._track_xy is not None else None,
                )
                idx = 0
                while idx < target_idx:
                    msg = replayer._messages[idx]
                    self._state_manager.process_message(msg.topic, msg.data, msg.timestamp)
                    idx += 1

            replayer._current_index = target_idx
            logger.info(f"Seeked to {target_ts:.1f}s (idx {target_idx})")

    def add_client(self, ws: WebSocket):
        self.clients.append(ws)

    def remove_client(self, ws: WebSocket):
        if ws in self.clients:
            self.clients.remove(ws)

    @property
    def client_count(self) -> int:
        return len(self.clients)

    async def stop(self):
        if self._replayer:
            self._replayer.stop()
        if self._signalr_client:
            await self._signalr_client.disconnect()
        if hasattr(self, '_playback_task') and self._playback_task:
            self._playback_task.cancel()
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        self._started = False
        logger.info(f"Live session stopped: {self.key}")


def _find_track_data(year: int, round_num: int, session_type: str) -> dict | None:
    """Find track data for a session, with fallback to other sessions/years based on location."""
    from services.storage import get_json

    # 1. Exact match
    data = get_json(f"sessions/{year}/{round_num}/{session_type}/track.json")
    if data:
        return data

    # 2. Other session types at the same year/round
    for alt_type in ("R", "Q", "S", "SQ", "FP1", "FP2", "FP3"):
        if alt_type == session_type:
            continue
        data = get_json(f"sessions/{year}/{round_num}/{alt_type}/track.json")
        if data:
            logger.info(f"Track data fallback: using {year}/{round_num}/{alt_type} for {session_type}")
            return data

    # 3. Same location in previous years
    schedule = get_json(f"seasons/{year}/schedule.json")
    if schedule:
        events = schedule.get("events", [])
        if 0 < round_num <= len(events):
            target_location = events[round_num - 1].get("location")
            if target_location:
                for prev_year in range(year - 1, year - 4, -1):
                    prev_schedule = get_json(f"seasons/{prev_year}/schedule.json")
                    if not prev_schedule:
                        import fastf1
                        try:
                            fastf1.get_event_schedule(prev_year)
                        except Exception:
                            pass
                        continue
                    
                    for prev_event in prev_schedule.get("events", []):
                        if prev_event.get("location") == target_location:
                            prev_round = prev_event.get("round_number")
                            for alt_type in ("R", "Q", "FP1", "FP2", "FP3"):
                                data = get_json(f"sessions/{prev_year}/{prev_round}/{alt_type}/track.json")
                                if data is not None:
                                    logger.info(f"Track fallback: using {prev_year}/{prev_round}/{alt_type} ({target_location})")
                                    return data

                # 4. Search local glob fallback
                import glob
                import json
                for path in glob.glob("backend/data/sessions/*/*/*/track.json"):
                    try:
                        with open(path, "r", encoding="utf-8") as f:
                            td = json.load(f)
                            if td.get("circuit_name") == target_location or td.get("circuit") == target_location:
                                logger.info(f"Track glob fallback: using local {path} for {target_location}")
                                return td
                    except Exception:
                        pass
                for path in glob.glob("data/sessions/*/*/*/track.json"):
                    try:
                        with open(path, "r", encoding="utf-8") as f:
                            td = json.load(f)
                            if td.get("circuit_name") == target_location or td.get("circuit") == target_location:
                                logger.info(f"Track glob fallback: using local {path} for {target_location}")
                                return td
                    except Exception:
                        pass

    return None


def _get_test_data_dir(year: int, round_num: int, session_type: str) -> str | None:
    """Find test data directory for a given session."""
    base = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "live_test")
    path = os.path.join(base, f"{year}_{round_num}_{session_type}")
    if os.path.isdir(path):
        return path
    return None


async def _get_or_create_session(
    year: int, round_num: int, session_type: str, speed: float, source: str
) -> LiveSession | None:
    """Get existing live session or create a new one.

    source: "auto" (test data if available, else SignalR), "test", or "signalr"
    """
    key = f"{year}_{round_num}_{session_type}"

    if key not in _live_sessions:
        data_dir = _get_test_data_dir(year, round_num, session_type)

        if source == "signalr":
            # Force real SignalR connection
            session = LiveSession(key, session_type)
            _live_sessions[key] = session
            await session.start(year=year, round_num=round_num, use_signalr=True)
        elif source == "test" and data_dir:
            # Force test replayer
            session = LiveSession(key, session_type)
            _live_sessions[key] = session
            await session.start(year=year, round_num=round_num, data_dir=data_dir, speed=speed)
        elif source == "auto":
            # Auto: use test data if available, otherwise try SignalR
            if data_dir:
                session = LiveSession(key, session_type)
                _live_sessions[key] = session
                await session.start(year=year, round_num=round_num, data_dir=data_dir, speed=speed)
            else:
                session = LiveSession(key, session_type)
                _live_sessions[key] = session
                await session.start(year=year, round_num=round_num, use_signalr=True)
        else:
            return None

    return _live_sessions[key]


@router.websocket("/ws/live/{year}/{round_num}")
async def live_websocket(
    websocket: WebSocket,
    year: int,
    round_num: int,
    type: str = Query("R"),
    speed: float = Query(10.0),
    source: str = Query("auto"),
    token: str = Query(""),
):
    from auth import is_auth_enabled, verify_token

    await websocket.accept()

    if is_auth_enabled() and not verify_token(token):
        await websocket.send_json({"type": "error", "message": "Unauthorized"})
        await websocket.close(code=4401, reason="Unauthorized")
        return

    session = None
    try:
        session = await _get_or_create_session(year, round_num, type, speed, source)

        if session is None:
            await websocket.send_json({
                "type": "error",
                "message": f"No live timing data available for {year}/{round_num}/{type}. "
                           "Download test data with: python backend/scripts/download_test_session.py "
                           f"--year {year} --round {round_num} --session {type}",
            })
            await websocket.close()
            return

        session.add_client(websocket)

        await websocket.send_json({
            "type": "ready",
            "mode": "live",
            "total_frames": 0,
            "total_time": 0,
            "total_laps": 0,
            "quali_phases": None,
        })

        # Broadcast loop: push frames to this client at ~2Hz
        frame_interval = 0.5

        async def handle_commands():
            """Listen for client commands."""
            try:
                while True:
                    raw = await websocket.receive_text()
                    logger.debug(f"Live WS command: {raw}")
                    try:
                        cmd = __import__("json").loads(raw)
                        if session:
                            if cmd.get("command") == "skip":
                                skip_seconds = float(cmd.get("seconds", 300))
                                session.skip_forward(skip_seconds)
                            elif cmd.get("command") == "seek":
                                target_time = float(cmd.get("time", 0))
                                if session._mode == "signalr":
                                    session.seek(target_time)
                                elif session._replayer and session._replayer._messages:
                                    first_ts = session._replayer._messages[0].timestamp
                                    session.seek(first_ts + target_time)
                            elif cmd.get("command") == "pause":
                                is_paused = bool(cmd.get("paused", False))
                                speed = float(cmd.get("speed", 1.0))
                                session.set_playback(is_paused, speed)

                    except Exception:
                        pass
            except WebSocketDisconnect:
                pass

        command_task = asyncio.create_task(handle_commands())

        try:
            while True:
                frame = session.get_frame()
                if frame:
                    await websocket.send_json({"type": "frame", **frame})

                    # Check if session has finished (only after it was actually started)
                    if (session._state_manager
                        and session._state_manager._session_was_started
                        and session._state_manager.session_status in ("Finalised", "Finished")):
                        await websocket.send_json({
                            "type": "finished",
                            "message": "Session ended. Full replay with track positions and telemetry will be available shortly.",
                        })
                        break

                await asyncio.sleep(frame_interval)
        finally:
            command_task.cancel()

    except WebSocketDisconnect:
        logger.info(f"Live WS disconnected: {year}/{round_num}")
    except Exception as e:
        logger.error(f"Live WS error: {e}")
        try:
            await websocket.close()
        except Exception:
            pass
    finally:
        if session:
            session.remove_client(websocket)
            # Clean up session if no more clients (delay slightly to allow
            # React Strict Mode remounts to reuse the session)
            if session.client_count == 0:
                await asyncio.sleep(2)
                if session.client_count == 0:
                    key = f"{year}_{round_num}_{type}"
                    if key in _live_sessions:
                        await session.stop()
                        del _live_sessions[key]
