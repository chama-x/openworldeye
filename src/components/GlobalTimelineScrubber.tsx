import { useCallback, useEffect, useMemo, useState } from "react";
import { useGlobalClock, type ClockMode, SCRUB_WINDOW_MS } from "@/contexts/GlobalClockContext";
import type { DeckVisualTheme } from "@/components/CommandGlobe";

const SPEED_PRESETS = [1, 10, 60, 600] as const;

function formatUtc(d: Date): string {
  return d.toISOString().replace("T", " ").slice(0, 23) + " UTC";
}

interface GlobalTimelineScrubberProps {
  visualTheme?: DeckVisualTheme;
}

export default function GlobalTimelineScrubber({
  visualTheme = "tactical",
}: GlobalTimelineScrubberProps) {
  const {
    currentTime,
    mode,
    speedMultiplier,
    setMode,
    setSpeedMultiplier,
    scrubTo,
    resetToLive,
    nudgeSeconds,
    getScrubBounds,
  } = useGlobalClock();

  const a = visualTheme === "analytic";

  const [boundsTick, setBoundsTick] = useState(0);
  useEffect(() => {
    if (mode !== "LIVE") return;
    const id = window.setInterval(() => setBoundsTick((n) => n + 1), 5000);
    return () => clearInterval(id);
  }, [mode]);

  const { start, end } = useMemo(() => {
    void boundsTick;
    return getScrubBounds();
  }, [getScrubBounds, boundsTick]);

  const span = end.getTime() - start.getTime() || SCRUB_WINDOW_MS;
  const sliderValue = useMemo(() => {
    const t = currentTime.getTime();
    const r = (t - start.getTime()) / span;
    return Math.min(1, Math.max(0, r));
  }, [currentTime, start, span]);

  const onSlider = useCallback(
    (ratio: number) => {
      const ms = start.getTime() + ratio * span;
      scrubTo(new Date(ms));
    },
    [scrubTo, start, span],
  );

  return (
    <div
      className={
        a
          ? "border-t border-slate-200 bg-gradient-to-b from-white to-slate-50 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
          : "tactical-panel tactical-corners border-t border-[rgba(0,255,156,0.2)] px-4 py-3"
      }
    >
      <div className="flex flex-wrap items-center gap-4">
        <div
          className={
            a
              ? "font-mono text-[10px] uppercase tracking-widest text-slate-500"
              : "font-mono text-[10px] uppercase tracking-widest text-[rgba(0,255,156,0.55)]"
          }
        >
          Sim clock
        </div>
        <div
          className={
            a
              ? "min-w-[220px] font-mono text-sm font-medium text-slate-900"
              : "glow-phosphor min-w-[220px] font-mono text-sm text-[#00FF9C]"
          }
        >
          {formatUtc(currentTime)}
        </div>

        <div className="flex gap-1" role="group" aria-label="Clock mode">
          {(["LIVE", "PAUSED", "REPLAY"] as ClockMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors ${
                mode === m
                  ? a
                    ? "bg-sky-100 text-slate-900 ring-1 ring-sky-400/60"
                    : "bg-[rgba(0,255,156,0.2)] text-[#00FF9C] ring-1 ring-[rgba(0,255,156,0.45)]"
                  : a
                    ? "bg-slate-100/80 text-slate-600 hover:text-slate-900"
                    : "bg-[rgba(255,255,255,0.04)] text-[rgba(0,255,156,0.5)] hover:text-[#00FF9C]"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={
              a
                ? "font-mono text-[9px] uppercase text-slate-500"
                : "font-mono text-[9px] uppercase text-[rgba(0,255,156,0.45)]"
            }
          >
            Replay ×
          </span>
          {SPEED_PRESETS.map((s) => (
            <button
              key={s}
              type="button"
              disabled={mode !== "REPLAY"}
              onClick={() => setSpeedMultiplier(s)}
              className={`rounded px-2 py-0.5 font-mono text-[10px] ${
                mode !== "REPLAY"
                  ? "cursor-not-allowed opacity-30"
                  : speedMultiplier === s
                    ? a
                      ? "bg-sky-100 text-slate-900"
                      : "bg-[rgba(0,255,156,0.15)] text-[#00FF9C]"
                    : a
                      ? "text-slate-600 hover:text-slate-900"
                      : "text-[rgba(0,255,156,0.55)] hover:text-[#00FF9C]"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex min-w-[200px] max-w-xl flex-1 flex-col gap-1">
          <div
            className={
              a
                ? "flex justify-between font-mono text-[9px] text-slate-500"
                : "flex justify-between font-mono text-[9px] text-[rgba(0,255,156,0.4)]"
            }
          >
            <span>{start.toISOString().slice(11, 19)}</span>
            <span>{end.toISOString().slice(11, 19)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={1000}
            step={1}
            disabled={mode === "LIVE"}
            value={Math.round(sliderValue * 1000)}
            onChange={(e) => onSlider(Number(e.target.value) / 1000)}
            className={
              a
                ? "h-1 w-full cursor-pointer accent-sky-600 disabled:cursor-not-allowed disabled:opacity-40"
                : "h-1 w-full cursor-pointer accent-[#00FF9C] disabled:cursor-not-allowed disabled:opacity-40"
            }
            aria-label="Scrub simulated time within last 24 hours"
            aria-valuemin={0}
            aria-valuemax={1000}
            aria-valuenow={Math.round(sliderValue * 1000)}
          />
          {mode === "LIVE" ? (
            <p className="font-mono text-[9px] leading-tight text-[rgba(255,184,0,0.85)]">
              Switch to PAUSED or REPLAY to scrub the simulated clock. LIVE tracks wall time.
            </p>
          ) : (
            <p
              className={
                a
                  ? "font-mono text-[9px] leading-tight text-slate-500"
                  : "font-mono text-[9px] leading-tight text-[rgba(0,255,156,0.35)]"
              }
            >
              Scrub affects TLE satellite propagation. Live OpenSky/USGS payloads stay “now” until historical feeds
              exist.
            </p>
          )}
        </div>

        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => nudgeSeconds(-3600)}
            className={
              a
                ? "rounded border border-slate-300 px-2 py-1 font-mono text-[10px] text-slate-700 hover:border-sky-500 hover:text-slate-900"
                : "rounded border border-[rgba(0,255,156,0.2)] px-2 py-1 font-mono text-[10px] text-[rgba(0,255,156,0.7)] hover:border-[#00FF9C] hover:text-[#00FF9C]"
            }
          >
            −1h
          </button>
          <button
            type="button"
            onClick={() => nudgeSeconds(3600)}
            className={
              a
                ? "rounded border border-slate-300 px-2 py-1 font-mono text-[10px] text-slate-700 hover:border-sky-500 hover:text-slate-900"
                : "rounded border border-[rgba(0,255,156,0.2)] px-2 py-1 font-mono text-[10px] text-[rgba(0,255,156,0.7)] hover:border-[#00FF9C] hover:text-[#00FF9C]"
            }
          >
            +1h
          </button>
          <button
            type="button"
            onClick={() => resetToLive()}
            className={
              a
                ? "rounded bg-sky-100 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-slate-900 ring-1 ring-sky-400/50 hover:bg-sky-200/80"
                : "rounded bg-[rgba(0,255,156,0.12)] px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-[#00FF9C] ring-1 ring-[rgba(0,255,156,0.35)] hover:bg-[rgba(0,255,156,0.2)]"
            }
          >
            Now
          </button>
        </div>
      </div>
    </div>
  );
}
