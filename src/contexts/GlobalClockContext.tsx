/**
 * GlobalClockContext - The 4D Time Synchronization Layer
 *
 * All data layers should respect this clock for scrub / replay. Note: live REST
 * feeds (OpenSky, USGS) only return "now" snapshots — true historical replay for
 * those layers needs archived endpoints or a backend (out of MVP). Satellite
 * positions from TLEs do follow currentTime (including scrub and replay).
 *
 * Modes:
 *   - LIVE   : wall UTC, tick ~1s (lightweight vs 60fps setState)
 *   - PAUSED : frozen; use scrubTo / nudgeSeconds
 *   - REPLAY : rAF advance at speedMultiplier
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type ClockMode = "LIVE" | "PAUSED" | "REPLAY";

/** Sliding window for the timeline scrubber UI (wall-clock span ending at "now"). */
export const SCRUB_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface ScrubBounds {
  start: Date;
  end: Date;
}

interface GlobalClockState {
  currentTime: Date;
  mode: ClockMode;
  speedMultiplier: number;
  setMode: (m: ClockMode) => void;
  setSpeedMultiplier: (s: number) => void;
  scrubTo: (d: Date) => void;
  resetToLive: () => void;
  /** Move simulated clock by delta (seconds); forces PAUSED. */
  nudgeSeconds: (deltaSec: number) => void;
  /** Latest wall moment and start = end - 24h (for scrub range UI). */
  getScrubBounds: () => ScrubBounds;
}

const GlobalClockContext = createContext<GlobalClockState | null>(null);

export function GlobalClockProvider({ children }: { children: ReactNode }) {
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());
  const [mode, setMode] = useState<ClockMode>("LIVE");
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const lastTickRef = useRef<number>(performance.now());

  useEffect(() => {
    if (mode !== "LIVE") return;
    setCurrentTime(new Date());
    const id = window.setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(id);
  }, [mode]);

  useEffect(() => {
    if (mode !== "REPLAY") return;
    lastTickRef.current = performance.now();
    let frame = 0;
    const tick = () => {
      const now = performance.now();
      const dtMs = now - lastTickRef.current;
      lastTickRef.current = now;
      setCurrentTime((prev) => new Date(prev.getTime() + dtMs * speedMultiplier));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [mode, speedMultiplier]);

  const scrubTo = useCallback((d: Date) => {
    setMode("PAUSED");
    setCurrentTime(d);
  }, []);

  const resetToLive = useCallback(() => {
    setMode("LIVE");
    setSpeedMultiplier(1);
    setCurrentTime(new Date());
  }, []);

  const nudgeSeconds = useCallback((deltaSec: number) => {
    setMode("PAUSED");
    setCurrentTime((prev) => new Date(prev.getTime() + deltaSec * 1000));
  }, []);

  const getScrubBounds = useCallback((): ScrubBounds => {
    const end = new Date();
    return { start: new Date(end.getTime() - SCRUB_WINDOW_MS), end };
  }, []);

  const value = useMemo<GlobalClockState>(
    () => ({
      currentTime,
      mode,
      speedMultiplier,
      setMode,
      setSpeedMultiplier,
      scrubTo,
      resetToLive,
      nudgeSeconds,
      getScrubBounds,
    }),
    [currentTime, mode, speedMultiplier, scrubTo, resetToLive, nudgeSeconds, getScrubBounds],
  );

  return (
    <GlobalClockContext.Provider value={value}>{children}</GlobalClockContext.Provider>
  );
}

export function useGlobalClock(): GlobalClockState {
  const ctx = useContext(GlobalClockContext);
  if (!ctx) throw new Error("useGlobalClock must be used inside GlobalClockProvider");
  return ctx;
}
