/**
 * Single place for OSINT hooks so OpenSky/USGS are not polled twice
 * (globe + intelligence panel share the same streams).
 */

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useAircraft, useSatellites, useEarthquakes, useConflicts } from "@/hooks/useOsintData";
import type { StreamMeta } from "@/hooks/useOsintData";
import type { Aircraft, ConflictEvent, Earthquake, Satellite } from "@/lib/osint-services";

export interface StreamSlice<T> {
  data: T[];
  loading: boolean;
  meta: StreamMeta;
}

export interface OsintSnapshot {
  aircraft: StreamSlice<Aircraft> & { refresh: () => void };
  satellites: StreamSlice<Satellite>;
  earthquakes: StreamSlice<Earthquake> & { refresh: () => void };
  conflicts: StreamSlice<ConflictEvent>;
}

const OsintDataContext = createContext<OsintSnapshot | null>(null);

export function OsintDataProvider({ children }: { children: ReactNode }) {
  const aircraft = useAircraft();
  const satellites = useSatellites();
  const earthquakes = useEarthquakes();
  const conflicts = useConflicts();

  const value = useMemo<OsintSnapshot>(
    () => ({
      aircraft: {
        data: aircraft.data,
        loading: aircraft.loading,
        meta: aircraft.meta,
        refresh: aircraft.refresh,
      },
      satellites: {
        data: satellites.data,
        loading: satellites.loading,
        meta: satellites.meta,
      },
      earthquakes: {
        data: earthquakes.data,
        loading: earthquakes.loading,
        meta: earthquakes.meta,
        refresh: earthquakes.refresh,
      },
      conflicts: {
        data: conflicts.data,
        loading: conflicts.loading,
        meta: conflicts.meta,
      },
    }),
    [aircraft, satellites, earthquakes, conflicts],
  );

  return <OsintDataContext.Provider value={value}>{children}</OsintDataContext.Provider>;
}

export function useOsintSnapshot(): OsintSnapshot {
  const ctx = useContext(OsintDataContext);
  if (!ctx) throw new Error("useOsintSnapshot must be used inside OsintDataProvider");
  return ctx;
}
