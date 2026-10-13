"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { wsUrl } from "@/lib/api";
import type { ReplayDriver, ReplayFrame, WeatherData, QualiPhase, RCMessage } from "./useReplaySocket";

export { type ReplayDriver, type ReplayFrame, type WeatherData, type QualiPhase, type RCMessage };

interface LiveState {
  connected: boolean;
  ready: boolean;
  loading: boolean;
  totalTime: number;
  frame: ReplayFrame | null;
  rcMessages: RCMessage[];
  finished: boolean;
  sessionEnded: boolean;
  error: string | null;
}

interface BufferedFrame {
  frame: ReplayFrame;
  rcMessages: RCMessage[];
  receivedAt: number; // Date.now() when received
}

export function useLiveSocket(
  year: number,
  round: number,
  sessionType: string = "R",
  speed: number = 1,
) {
  const wsRef = useRef<WebSocket | null>(null);
  const hasShownFirstFrame = useRef(false);
  const [state, setState] = useState<LiveState>({
    connected: false,
    ready: false,
    loading: true,
    totalTime: 0,
    frame: null,
    rcMessages: [],
    finished: false,
    sessionEnded: false,
    error: null,
  });

  // Reset state when session changes
  useEffect(() => {
    setState({
      connected: false,
      ready: false,
      loading: true,
      totalTime: 0,
      frame: null,
      rcMessages: [],
      finished: false,
      sessionEnded: false,
      error: null,
    });
    hasShownFirstFrame.current = false;
  }, [year, round, sessionType]);

  // Send speed / pause commands dynamically without reconnecting
  useEffect(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        command: 'pause',
        paused: speed === 0,
        speed: speed === 0 ? 1 : speed
      }));
    }
  }, [speed]);

  useEffect(() => {
    let aborted = false;
    const url = wsUrl(`/ws/live/${year}/${round}?type=${sessionType}`);
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!aborted) {
        setState((s) => ({ ...s, connected: true }));
        // Ensure backend matches our current speed state on connect
        ws.send(JSON.stringify({
          command: 'pause',
          paused: speed === 0,
          speed: speed === 0 ? 1 : speed
        }));
      }
    };

    ws.onmessage = (event) => {
      if (aborted) return;
      const msg = JSON.parse(event.data);

      switch (msg.type) {
        case "status":
          setState((s) => ({ ...s, loading: true }));
          break;
        case "ready":
          setState((s) => ({
            ...s,
            ready: true,
            loading: false,
            totalTime: msg.total_time || 0,
          }));
          break;
        case "frame": {
          const frame: ReplayFrame = {
            timestamp: msg.timestamp,
            lap: msg.lap,
            total_laps: msg.total_laps,
            session_type: msg.session_type,
            drivers: msg.drivers,
            status: msg.status,
            weather: msg.weather,
            quali_phase: msg.quali_phase,
          };
          const rcMessages: RCMessage[] = msg.rc_messages || [];

          // No frontend delay buffering - backend DVR handles it
          setState((s) => ({ ...s, frame, rcMessages }));
          break;
        }
        case "finished":
          setState((s) => ({
            ...s,
            finished: true,
            sessionEnded: true,
          }));
          break;
        case "error":
          setState((s) => ({ ...s, error: msg.message, loading: false }));
          break;
      }
    };

    ws.onerror = () => {
      if (!aborted) {
        setState((s) => ({ ...s, error: "WebSocket connection error", loading: false }));
      }
    };

    ws.onclose = () => {
      if (!aborted) {
        setState((s) => ({ ...s, connected: false }));
      }
    };

    return () => {
      aborted = true;
      ws.close();
    };
  }, [year, round, sessionType, speed]);

  const send = useCallback((msg: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(msg);
    }
  }, []);

  return { ...state, send };
}
