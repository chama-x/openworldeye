import { useEffect, useMemo, useState } from "react";
import CommandGlobe, { type MarkerLike } from "@/components/CommandGlobe";
import GlobalTimelineScrubber from "@/components/GlobalTimelineScrubber";
import IntelligenceBrief from "@/components/IntelligenceBrief";
import { useDataLayers, type LayerId } from "@/contexts/DataLayersContext";
import { useGlobalClock } from "@/contexts/GlobalClockContext";
import { useOsintSnapshot } from "@/contexts/OsintDataContext";

function utcClock(d: Date): string {
  return d.toISOString().slice(11, 19) + "Z";
}

export default function CommandDeck() {
  const [selected, setSelected] = useState<MarkerLike | null>(null);
  const [wallUtc, setWallUtc] = useState(() => new Date());
  const { currentTime, mode } = useGlobalClock();

  useEffect(() => {
    const id = window.setInterval(() => setWallUtc(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const { layers, toggleLayer } = useDataLayers();
  const osint = useOsintSnapshot();

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

  return (
    <div className="flex h-dvh min-h-0 flex-col bg-[#0A0E14] text-foreground">
      <header className="z-20 flex shrink-0 items-center justify-between gap-4 border-b border-[rgba(0,255,156,0.15)] bg-[rgba(10,14,20,0.92)] px-4 py-2 backdrop-blur-md">
        <div className="flex flex-col gap-0.5">
          <span
            className="brand-wordmark-spaced text-[11px] tracking-[0.22em] text-[#00FF9C]"
            translate="no"
          >
            OPEN WORLD EYE
          </span>
          <span className="font-mono text-[9px] uppercase tracking-wider text-[rgba(0,255,156,0.45)]">
            OpenWorldEye · OSINT globe
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-6 font-mono text-[10px] text-[rgba(0,255,156,0.75)]">
          <div>
            <span className="text-[rgba(0,255,156,0.4)]">WALL UTC </span>
            <span className="text-[#00FF9C]">{utcClock(wallUtc)}</span>
          </div>
          <div>
            <span className="text-[rgba(0,255,156,0.4)]">SIM </span>
            <span className="text-[#FFB800]">{utcClock(currentTime)}</span>
            <span className="ml-2 text-[rgba(0,255,156,0.4)]">{mode}</span>
          </div>
          <div>
            <span className="text-[rgba(0,255,156,0.4)]">MARKERS </span>
            <span className="text-[#00FF9C]">{totalMarkers}</span>
            {loadingAny ? <span className="ml-2 data-shimmer rounded px-1">LOAD</span> : null}
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside className="z-10 flex w-full shrink-0 flex-col border-b border-[rgba(0,255,156,0.12)] bg-[rgba(10,14,20,0.88)] lg:w-52 lg:border-b-0 lg:border-r">
          <div className="tactical-panel-header">Data layers</div>
          <nav className="flex flex-row gap-1 overflow-x-auto p-2 lg:flex-col lg:overflow-x-visible">
            {layers.map((layer) => (
              <button
                key={layer.id}
                type="button"
                onClick={() => toggleLayer(layer.id as LayerId)}
                className={`flex min-w-[120px] items-center gap-2 rounded border px-2 py-2 text-left transition-colors lg:min-w-0 ${
                  layer.active
                    ? "border-[rgba(0,255,156,0.35)] bg-[rgba(0,255,156,0.06)]"
                    : "border-[rgba(255,255,255,0.06)] bg-transparent opacity-60 hover:opacity-90"
                }`}
              >
                <span className="text-base" style={{ color: layer.color }} aria-hidden>
                  {layer.icon}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-mono text-[10px] font-semibold text-[#00FF9C]">{layer.label}</span>
                  <span className="truncate font-mono text-[9px] text-[rgba(0,255,156,0.4)]">{layer.source}</span>
                </span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="relative min-h-[280px] flex-1 scanlines">
          <CommandGlobe
            onSelectMarker={(m) => {
              setSelected(m);
            }}
          />
        </main>

        <aside className="z-10 h-64 shrink-0 border-t border-[rgba(0,255,156,0.12)] bg-[rgba(10,14,20,0.88)] lg:h-auto lg:w-80 lg:border-l lg:border-t-0">
          <IntelligenceBrief selected={selected} />
        </aside>
      </div>

      <footer className="shrink-0">
        <GlobalTimelineScrubber />
      </footer>
    </div>
  );
}
