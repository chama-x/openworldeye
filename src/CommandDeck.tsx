import { useEffect, useMemo, useState } from "react";
import CommandGlobe, { type DeckVisualTheme, type MarkerLike } from "@/components/CommandGlobe";
import GlobalTimelineScrubber from "@/components/GlobalTimelineScrubber";
import IntelligenceBrief from "@/components/IntelligenceBrief";
import { useDataLayers, type LayerId } from "@/contexts/DataLayersContext";
import { useGlobalClock } from "@/contexts/GlobalClockContext";
import { useOsintSnapshot } from "@/contexts/OsintDataContext";
import { feedStripPart } from "@/lib/feedMeta";

function utcClock(d: Date): string {
  return d.toISOString().slice(11, 19) + "Z";
}

export default function CommandDeck() {
  const [theme, setTheme] = useState<DeckVisualTheme>("tactical");
  const [selected, setSelected] = useState<MarkerLike | null>(null);
  const [wallUtc, setWallUtc] = useState(() => new Date());
  const { currentTime, mode } = useGlobalClock();

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "analytic") {
      root.dataset.theme = "analytic";
    } else {
      delete root.dataset.theme;
    }
    return () => {
      delete root.dataset.theme;
    };
  }, [theme]);

  useEffect(() => {
    const id = window.setInterval(() => setWallUtc(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const { layers, toggleLayer } = useDataLayers();
  const osint = useOsintSnapshot();

  const isAnalytic = theme === "analytic";

  const totalMarkers = useMemo(() => {
    return (
      osint.aircraft.data.length +
      osint.satellites.data.length +
      osint.earthquakes.data.length +
      osint.conflicts.data.length
    );
  }, [osint]);

  const loadingAny =
    osint.aircraft.loading || osint.satellites.loading || osint.earthquakes.loading;

  const feedStrip = useMemo(
    () =>
      [
        feedStripPart("AIR", osint.aircraft.meta, osint.aircraft.loading),
        feedStripPart("ORB", osint.satellites.meta, osint.satellites.loading),
        feedStripPart("SEIS", osint.earthquakes.meta, osint.earthquakes.loading),
        feedStripPart("OPS", osint.conflicts.meta, osint.conflicts.loading),
      ].join("   ·   "),
    [osint],
  );

  return (
    <div
      className={`owe-deck flex h-dvh min-h-0 flex-col ${
        isAnalytic ? "bg-[#F8FAFC] text-slate-900" : "bg-[#0A0E14] text-foreground"
      }`}
    >
      <header
        role="banner"
        className={
          isAnalytic
            ? "z-20 flex shrink-0 flex-col gap-1 border-b border-slate-200/90 bg-white/90 px-4 py-2 backdrop-blur-md"
            : "z-20 flex shrink-0 flex-col gap-1 border-b border-[rgba(0,255,156,0.15)] bg-[rgba(10,14,20,0.92)] px-4 py-2 backdrop-blur-md"
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <span
              className={
                isAnalytic
                  ? "brand-wordmark-spaced text-[11px] tracking-[0.22em] text-slate-900"
                  : "brand-wordmark-spaced text-[11px] tracking-[0.22em] text-[#00FF9C]"
              }
              translate="no"
            >
              OPEN WORLD EYE
            </span>
            <span
              className={
                isAnalytic
                  ? "font-mono text-[9px] uppercase tracking-wider text-slate-500"
                  : "font-mono text-[9px] uppercase tracking-wider text-[rgba(0,255,156,0.45)]"
              }
            >
              OpenWorldEye · OSINT globe
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:gap-6">
            <div
              className={`flex rounded border font-mono text-[9px] uppercase tracking-wider ${
                isAnalytic ? "border-slate-300" : "border-[rgba(0,255,156,0.35)]"
              }`}
              role="group"
              aria-label="Visual theme"
            >
              <button
                type="button"
                aria-pressed={!isAnalytic}
                onClick={() => setTheme("tactical")}
                className={
                  !isAnalytic
                    ? "border-r border-[rgba(0,255,156,0.35)] bg-[rgba(0,255,156,0.12)] px-2 py-1 text-[#00FF9C]"
                    : "border-r border-slate-200 bg-transparent px-2 py-1 text-slate-500 hover:bg-slate-100"
                }
              >
                Tactical
              </button>
              <button
                type="button"
                aria-pressed={isAnalytic}
                onClick={() => setTheme("analytic")}
                className={
                  isAnalytic
                    ? "bg-slate-200/90 px-2 py-1 text-slate-900"
                    : "bg-transparent px-2 py-1 text-[rgba(0,255,156,0.55)] hover:bg-[rgba(0,255,156,0.06)]"
                }
              >
                Analytic
              </button>
            </div>
            <div
              className={
                isAnalytic
                  ? "flex flex-wrap items-center gap-6 font-mono text-[10px] text-slate-600"
                  : "flex flex-wrap items-center gap-6 font-mono text-[10px] text-[rgba(0,255,156,0.75)]"
              }
            >
              <div title="Real-time clock in this browser (UTC). Independent of the simulated clock below.">
                <span className={isAnalytic ? "text-slate-400" : "text-[rgba(0,255,156,0.4)]"}>
                  WALL UTC{" "}
                </span>
                <span className={isAnalytic ? "font-medium text-slate-900" : "text-[#00FF9C]"}>
                  {utcClock(wallUtc)}
                </span>
              </div>
              <div title="Simulated time: drives TLE satellite positions and the timeline. LIVE tracks wall clock; PAUSED/REPLAY use the scrubber.">
                <span className={isAnalytic ? "text-slate-400" : "text-[rgba(0,255,156,0.4)]"}>SIM </span>
                <span className="text-[#FFB800]">{utcClock(currentTime)}</span>
                <span
                  className={`ml-2 ${isAnalytic ? "text-slate-400" : "text-[rgba(0,255,156,0.4)]"}`}
                >
                  {mode}
                </span>
              </div>
              <div>
                <span className={isAnalytic ? "text-slate-400" : "text-[rgba(0,255,156,0.4)]"}>
                  MARKERS{" "}
                </span>
                <span className={isAnalytic ? "font-medium text-slate-900" : "text-[#00FF9C]"}>
                  {totalMarkers}
                </span>
                {loadingAny ? <span className="ml-2 data-shimmer rounded px-1">LOAD</span> : null}
              </div>
            </div>
          </div>
        </div>
        <p
          className={
            isAnalytic
              ? "hidden font-mono text-[9px] leading-snug text-slate-500 md:block"
              : "hidden font-mono text-[9px] leading-snug text-[rgba(0,255,156,0.42)] md:block"
          }
          aria-label="Data feed status"
        >
          {feedStrip}
        </p>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside
          role="navigation"
          aria-label="Data layers"
          className={
            isAnalytic
              ? "z-10 flex w-full shrink-0 flex-col border-b border-slate-200/90 bg-slate-50/95 lg:w-52 lg:border-b-0 lg:border-r"
              : "z-10 flex w-full shrink-0 flex-col border-b border-[rgba(0,255,156,0.12)] bg-[rgba(10,14,20,0.88)] lg:w-52 lg:border-b-0 lg:border-r"
          }
        >
          <div className="tactical-panel-header">Data layers</div>
          <nav className="flex flex-row gap-1 overflow-x-auto p-2 lg:flex-col lg:overflow-x-visible">
            {layers.map((layerRow) => (
              <button
                key={layerRow.id}
                type="button"
                aria-pressed={layerRow.active}
                aria-label={`${layerRow.label} layer from ${layerRow.source}. ${layerRow.active ? "Active" : "Inactive"}. Toggle.`}
                onClick={() => toggleLayer(layerRow.id as LayerId)}
                className={`flex min-h-11 min-w-[120px] items-center gap-2 rounded border px-2 py-2.5 text-left transition-colors sm:min-h-0 lg:min-w-0 ${
                  layerRow.active
                    ? isAnalytic
                      ? "border-sky-400/60 bg-sky-50"
                      : "border-[rgba(0,255,156,0.35)] bg-[rgba(0,255,156,0.06)]"
                    : isAnalytic
                      ? "border-slate-200/80 bg-transparent opacity-80 hover:bg-slate-100/80 hover:opacity-100"
                      : "border-[rgba(255,255,255,0.06)] bg-transparent opacity-60 hover:opacity-90"
                }`}
              >
                <span className="text-base" style={{ color: layerRow.color }} aria-hidden>
                  {layerRow.icon}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span
                    className={`font-mono text-[10px] font-semibold ${
                      isAnalytic ? "text-slate-900" : "text-[#00FF9C]"
                    }`}
                  >
                    {layerRow.label}
                  </span>
                  <span
                    className={`truncate font-mono text-[9px] ${
                      isAnalytic ? "text-slate-500" : "text-[rgba(0,255,156,0.4)]"
                    }`}
                  >
                    {layerRow.source}
                  </span>
                </span>
              </button>
            ))}
          </nav>
        </aside>

        <main role="main" aria-label="Globe" className="relative min-h-[280px] flex-1 scanlines">
          <CommandGlobe
            visualTheme={theme}
            onSelectMarker={(m) => {
              setSelected(m);
            }}
          />
        </main>

        <aside
          role="complementary"
          aria-label="Intelligence summary"
          className={
            isAnalytic
              ? "z-10 flex min-h-[min(50dvh,22rem)] max-h-[55dvh] shrink-0 flex-col border-t border-slate-200/90 bg-slate-50/95 lg:h-auto lg:max-h-none lg:w-80 lg:min-h-0 lg:border-l lg:border-t-0"
              : "z-10 flex min-h-[min(50dvh,22rem)] max-h-[55dvh] shrink-0 flex-col border-t border-[rgba(0,255,156,0.12)] bg-[rgba(10,14,20,0.88)] lg:h-auto lg:max-h-none lg:w-80 lg:min-h-0 lg:border-l lg:border-t-0"
          }
        >
          <IntelligenceBrief
            visualTheme={theme}
            selected={selected}
            onClearSelection={() => setSelected(null)}
          />
        </aside>
      </div>

      <footer className="shrink-0">
        <GlobalTimelineScrubber visualTheme={theme} />
      </footer>
    </div>
  );
}
