/**
 * DataLayersContext - Toggle and manage active OSINT data layers
 *
 * Each layer corresponds to a free-tier API endpoint:
 *   - aircraft  → ADSB.fi Open Data
 *   - satellites → CelesTrak (TLE) + satellite.js propagation
 *   - earthquakes → USGS Earthquakes feed
 *   - conflicts → ACLED
 *   - maritime → AISStream.io (WebSocket)
 *   - gpsjam → GPSJam.org export
 *
 * Polling intervals respect free-tier rate limits.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type LayerId =
  | "aircraft"
  | "satellites"
  | "earthquakes"
  | "conflicts"
  | "maritime"
  | "gpsjam"
  | "infrastructure";

export interface LayerConfig {
  id: LayerId;
  label: string;
  description: string;
  source: string;
  color: string; // hex
  icon: string; // single character glyph
  active: boolean;
  pollIntervalSec: number;
}

const DEFAULT_LAYERS: LayerConfig[] = [
  {
    id: "aircraft",
    label: "AIR",
    description: "Live commercial & general aviation flights",
    source: "ADSB.fi",
    color: "#00FF9C",
    icon: "✈",
    active: true,
    pollIntervalSec: 8,
  },
  {
    id: "satellites",
    label: "ORB",
    description: "Active satellites in low Earth orbit",
    source: "CelesTrak NORAD",
    color: "#7DD3FC",
    icon: "◉",
    active: true,
    pollIntervalSec: 600,
  },
  {
    id: "earthquakes",
    label: "SEIS",
    description: "Seismic events ≥ M2.5 last 24h",
    source: "USGS",
    color: "#FFB800",
    icon: "▲",
    active: true,
    pollIntervalSec: 300,
  },
  {
    id: "conflicts",
    label: "OPS",
    description: "Conflict events & tactical incidents",
    source: "ACLED",
    color: "#FF3333",
    icon: "✶",
    active: true,
    pollIntervalSec: 1800,
  },
  {
    id: "maritime",
    label: "SEA",
    description: "AIS vessel positions (AISStream)",
    source: "AISStream.io",
    color: "#7DD3FC",
    icon: "⚓",
    active: true,
    pollIntervalSec: 15,
  },
  {
    id: "gpsjam",
    label: "JAMMING",
    description: "GPS interference / spoofing indicators",
    source: "GPSJam.org",
    color: "#FFB800",
    icon: "◎",
    active: true,
    pollIntervalSec: 3600,
  },
  {
    id: "infrastructure",
    label: "INFRA",
    description: "Critical infrastructure markers",
    source: "Sample dataset",
    color: "#A78BFA",
    icon: "■",
    active: false,
    pollIntervalSec: 0,
  },
];

interface DataLayersState {
  layers: LayerConfig[];
  toggleLayer: (id: LayerId) => void;
  isActive: (id: LayerId) => boolean;
  layer: (id: LayerId) => LayerConfig;
}

const DataLayersContext = createContext<DataLayersState | null>(null);

export function DataLayersProvider({ children }: { children: ReactNode }) {
  const [layers, setLayers] = useState<LayerConfig[]>(DEFAULT_LAYERS);

  const toggleLayer = useCallback((id: LayerId) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, active: !l.active } : l)),
    );
  }, []);

  const isActive = useCallback(
    (id: LayerId) => layers.find((l) => l.id === id)?.active ?? false,
    [layers],
  );

  const layer = useCallback(
    (id: LayerId) => layers.find((l) => l.id === id) as LayerConfig,
    [layers],
  );

  const value = useMemo<DataLayersState>(
    () => ({ layers, toggleLayer, isActive, layer }),
    [layers, toggleLayer, isActive, layer],
  );

  return (
    <DataLayersContext.Provider value={value}>{children}</DataLayersContext.Provider>
  );
}

export function useDataLayers(): DataLayersState {
  const ctx = useContext(DataLayersContext);
  if (!ctx) throw new Error("useDataLayers must be used inside DataLayersProvider");
  return ctx;
}
