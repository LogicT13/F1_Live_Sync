import logging

from fastapi import APIRouter, Query, HTTPException
from services.storage import get_json
from services.process import ensure_session_data

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["track"])


@router.get("/sessions/{year}/{round_num}/track")
async def track_geometry(
    year: int,
    round_num: int,
    type: str = Query("R", description="Session type"),
):
    data = get_json(f"sessions/{year}/{round_num}/{type}/track.json")
    if data is not None:
        return data

    # Fast fallback 1: same year, different session type
    for alt_type in ("R", "Q", "S", "SQ", "FP1", "FP2", "FP3"):
        if alt_type == type:
            continue
        data = get_json(f"sessions/{year}/{round_num}/{alt_type}/track.json")
        if data is not None:
            logger.info(f"Track fallback: using {year}/{round_num}/{alt_type} for {type}")
            return data

    # Fast fallback 2: find by location in previous years
    # This is critical because round_num changes per year (e.g. R18 in 2026 is not R18 in 2024)
    schedule = get_json(f"seasons/{year}/schedule.json")
    if schedule:
        events = schedule.get("events", [])
        if 0 < round_num <= len(events):
            target_location = events[round_num - 1].get("location")
            if target_location:
                # Buscar en los últimos 3 años (2025, 2024, 2023)
                for prev_year in range(year - 1, year - 4, -1):
                    prev_schedule = get_json(f"seasons/{prev_year}/schedule.json")
                    if not prev_schedule:
                        # Si no existe el schedule local, intentamos forzar cargarlo desde fastf1
                        import fastf1
                        try:
                            fastf1.get_event_schedule(prev_year) # esto descarga al caché
                            # Simplificación: si no lo tenemos en nuestro storage, lo salteamos por rendimiento
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

    # On-demand: try to process the session via FastF1 (last resort)
    available = await ensure_session_data(year, round_num, type)
    if available:
        data = get_json(f"sessions/{year}/{round_num}/{type}/track.json")
        if data is not None:
            return data

    # If it failed (e.g. future session), try to find ANY local track with the same location
    schedule = get_json(f"seasons/{year}/schedule.json")
    if schedule:
        events = schedule.get("events", [])
        if 0 < round_num <= len(events):
            target_location = events[round_num - 1].get("location")
            if target_location:
                # 1. Search locally FIRST (instant)
                import glob
                import json
                for path in glob.glob("backend/data/sessions/*/*/*/track.json"):
                    try:
                        with open(path, "r", encoding="utf-8") as f:
                            td = json.load(f)
                            if td.get("circuit_name") == target_location or td.get("circuit") == target_location:
                                logger.info(f"Track fallback: using local {path} for {target_location}")
                                return td
                    except Exception:
                        pass
                for path in glob.glob("data/sessions/*/*/*/track.json"): # Fallback for relative path
                    try:
                        with open(path, "r", encoding="utf-8") as f:
                            td = json.load(f)
                            if td.get("circuit_name") == target_location or td.get("circuit") == target_location:
                                logger.info(f"Track fallback: using local {path} for {target_location}")
                                return td
                    except Exception:
                        pass
                        
                # 2. If not found locally, download previous year
                for prev_year in range(year - 1, year - 4, -1):
                    import fastf1
                    try:
                        sched = fastf1.get_event_schedule(prev_year)
                        for _, row in sched.iterrows():
                            if row["Location"] == target_location:
                                prev_round = row["RoundNumber"]
                                logger.info(f"Downloading previous year {prev_year} round {prev_round} for {target_location} track geometry...")
                                avail = await ensure_session_data(prev_year, prev_round, "R")
                                if avail:
                                    data = get_json(f"sessions/{prev_year}/{prev_round}/R/track.json")
                                    if data is not None:
                                        return data
                    except Exception as e:
                        logger.error(f"Fallback fastf1 error: {e}")
                        pass

    raise HTTPException(
        status_code=404,
        detail="Track data not available for this session.",
    )
