import { useCallback, useMemo, useState } from "react";
import { useGlobalClock } from "@/contexts/GlobalClockContext";
import { useDataLayers } from "@/contexts/DataLayersContext";
import { useOsintSnapshot } from "@/contexts/OsintDataContext";
import type { DeckVisualTheme, MarkerLike } from "@/components/CommandGlobe";
import { MAX_AIRCRAFT_GLOBE_POINTS } from "@/lib/constants";
import { feedStripPart } from "@/lib/feedMeta";

interface IntelligenceBriefProps {
  visualTheme?: DeckVisualTheme;
  selected: MarkerLike | null;
  onClearSelection: () => void;
}

export default function IntelligenceBrief({
  visualTheme = "tactical",
  selected,
  onClearSelection,
}: IntelligenceBriefProps) {
  const { currentTime, mode } = useGlobalClock();
  const { layers } = useDataLayers();
  const osint = useOsintSnapshot();
  const [llmOut, setLlmOut] = useState<string | null>(null);
  const [llmBusy, setLlmBusy] = useState(false);
  const [llmErr, setLlmErr] = useState<string | null>(null);

  const counts = useMemo(
    () => ({
      air: osint.aircraft.data.length,
      orb: osint.satellites.data.length,
      seis: osint.earthquakes.data.length,
      ops: osint.conflicts.data.length,
    }),
    [osint],
  );

  const aircraftCapped = counts.air > MAX_AIRCRAFT_GLOBE_POINTS;

  const activeLayers = useMemo(() => layers.filter((l) => l.active).map((l) => l.label).join(" · "), [layers]);

  const heuristicBrief = useMemo(() => {
    const lines: string[] = [];
    lines.push(`Layers on: ${activeLayers || "—"}`);
    lines.push(`Markers — AIR ${counts.air} · ORB ${counts.orb} · SEIS ${counts.seis} · OPS ${counts.ops}`);
    if (aircraftCapped) {
      lines.push(
        `Globe shows first ${MAX_AIRCRAFT_GLOBE_POINTS} aircraft only (${counts.air} in feed).`,
      );
    }
    lines.push(feedStripPart("AIR", osint.aircraft.meta, osint.aircraft.loading));
    lines.push(feedStripPart("ORB", osint.satellites.meta, osint.satellites.loading));
    lines.push(feedStripPart("SEIS", osint.earthquakes.meta, osint.earthquakes.loading));
    lines.push(feedStripPart("OPS", osint.conflicts.meta, osint.conflicts.loading));
    if (osint.aircraft.meta.errorMessage && osint.aircraft.meta.source === "fallback") {
      lines.push(`AIR fallback: ${osint.aircraft.meta.errorMessage}`);
    }
    if (osint.earthquakes.meta.errorMessage && osint.earthquakes.meta.source === "fallback") {
      lines.push(`SEIS fallback: ${osint.earthquakes.meta.errorMessage}`);
    }
    if (osint.satellites.meta.errorMessage && osint.satellites.meta.source === "fallback") {
      lines.push(`ORB fallback: ${osint.satellites.meta.errorMessage}`);
    }
    if (osint.aircraft.loading || osint.satellites.loading || osint.earthquakes.loading) {
      lines.push("Status: one or more feeds loading…");
    } else {
      lines.push("Status: feeds idle (polling on layer timers)");
    }
    lines.push(`Clock mode ${mode}; sim UTC ${currentTime.toISOString()}`);
    lines.push("Note: OpenSky/USGS reflect live service time; scrub changes satellite TLE propagation only.");
    return lines.join("\n");
  }, [activeLayers, aircraftCapped, counts, currentTime, mode, osint]);

  const runGroq = useCallback(async () => {
    const key = import.meta.env.VITE_GROQ_API_KEY;
    if (!key) {
      setLlmErr("Set VITE_GROQ_API_KEY for optional synthesis.");
      return;
    }
    setLlmBusy(true);
    setLlmErr(null);
    setLlmOut(null);
    const model = import.meta.env.VITE_GROQ_MODEL ?? "llama-3.1-8b-instant";
    const prompt = `You are an OSINT analyst. In ≤120 words, summarize this tactical picture for an operator. No speculation beyond counts.\n\n${heuristicBrief}`;
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          max_tokens: 256,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const text = json.choices?.[0]?.message?.content?.trim() ?? "";
      setLlmOut(text || "(empty response)");
    } catch (e) {
      setLlmErr(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLlmBusy(false);
    }
  }, [heuristicBrief]);

  const a = visualTheme === "analytic";

  return (
    <div
      className={
        a
          ? "flex h-full min-h-0 flex-col rounded-none border border-slate-200/90 bg-white/95 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.6)]"
          : "tactical-panel flex h-full min-h-0 flex-col"
      }
    >
      <div className="tactical-panel-header">
        <span>Intelligence</span>
        <span className="flex items-center gap-2">
          <span className={a ? "text-slate-500" : "text-[rgba(0,255,156,0.45)]"}>BRIEF</span>
          {selected ? (
            <button
              type="button"
              onClick={onClearSelection}
              className={
                a
                  ? "rounded border border-slate-300 px-2 py-0.5 font-mono text-[9px] uppercase text-slate-800 hover:bg-slate-100"
                  : "rounded border border-[rgba(0,255,156,0.35)] px-2 py-0.5 font-mono text-[9px] uppercase text-[#00FF9C] hover:bg-[rgba(0,255,156,0.1)]"
              }
            >
              Clear
            </button>
          ) : null}
        </span>
      </div>
      <div
        className={
          a
            ? "flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 font-sans text-xs text-slate-800"
            : "flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 font-sans text-xs text-[rgba(230,238,248,0.88)]"
        }
      >
        <section>
          <h3
            className={
              a
                ? "mb-1 font-mono text-[10px] uppercase tracking-widest text-slate-500"
                : "mb-1 font-mono text-[10px] uppercase tracking-widest text-[rgba(0,255,156,0.5)]"
            }
          >
            Field summary
          </h3>
          <pre
            className={
              a
                ? "whitespace-pre-wrap rounded border border-slate-200 bg-slate-50 p-2 font-mono text-[10px] leading-relaxed text-slate-800"
                : "whitespace-pre-wrap rounded border border-[rgba(0,255,156,0.12)] bg-[rgba(0,0,0,0.35)] p-2 font-mono text-[10px] leading-relaxed text-[rgba(0,255,156,0.85)]"
            }
          >
            {heuristicBrief}
          </pre>
        </section>

        <section>
          <h3
            className={
              a
                ? "mb-1 font-mono text-[10px] uppercase tracking-widest text-slate-500"
                : "mb-1 font-mono text-[10px] uppercase tracking-widest text-[rgba(0,255,156,0.5)]"
            }
          >
            Selected marker
          </h3>
          {selected ? (
            <pre
              className={
                a
                  ? "max-h-40 overflow-auto rounded border border-slate-200 bg-slate-50 p-2 font-mono text-[10px] text-slate-800"
                  : "max-h-40 overflow-auto rounded border border-[rgba(0,255,156,0.12)] bg-[rgba(0,0,0,0.35)] p-2 font-mono text-[10px] text-[rgba(0,255,156,0.85)]"
              }
            >
              {JSON.stringify(
                {
                  category: selected.category,
                  label: selected.label,
                  lat: selected.lat,
                  lng: selected.lng,
                  raw: selected.raw,
                },
                null,
                2,
              )}
            </pre>
          ) : (
            <p className={a ? "font-mono text-[10px] text-slate-500" : "font-mono text-[10px] text-[rgba(0,255,156,0.35)]"}>
              Click a globe point… (Escape clears)
            </p>
          )}
        </section>

        <section
          className={a ? "mt-auto border-t border-slate-200 pt-2" : "mt-auto border-t border-[rgba(0,255,156,0.1)] pt-2"}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3
              className={
                a
                  ? "font-mono text-[10px] uppercase tracking-widest text-slate-500"
                  : "font-mono text-[10px] uppercase tracking-widest text-[rgba(0,255,156,0.5)]"
              }
            >
              LLM synthesis (optional)
            </h3>
            <button
              type="button"
              disabled={llmBusy}
              onClick={() => void runGroq()}
              className={
                a
                  ? "rounded bg-sky-100 px-2 py-1 font-mono text-[9px] uppercase text-slate-900 ring-1 ring-sky-300/60 hover:bg-sky-200/80 disabled:opacity-40"
                  : "rounded bg-[rgba(0,255,156,0.1)] px-2 py-1 font-mono text-[9px] uppercase text-[#00FF9C] ring-1 ring-[rgba(0,255,156,0.25)] hover:bg-[rgba(0,255,156,0.18)] disabled:opacity-40"
              }
            >
              {llmBusy ? "…" : "Synthesize"}
            </button>
          </div>
          {llmErr ? (
            <p className="font-mono text-[10px] text-[#FF3333]">{llmErr}</p>
          ) : null}
          {llmOut ? (
            <p
              className={
                a
                  ? "rounded border border-slate-200 bg-slate-50 p-2 font-mono text-[10px] leading-relaxed text-slate-800"
                  : "rounded border border-[rgba(0,255,156,0.12)] bg-[rgba(0,0,0,0.25)] p-2 font-mono text-[10px] leading-relaxed text-[rgba(230,238,248,0.9)]"
              }
            >
              {llmOut}
            </p>
          ) : null}
        </section>
      </div>
    </div>
  );
}
