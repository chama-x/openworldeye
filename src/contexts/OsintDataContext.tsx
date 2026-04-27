/**
 * Single place for OSINT hooks so feeds are not polled twice
 * (globe + intelligence panel share the same streams).
 */

import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import {
  useAircraft,
  useSatellites,
  useEarthquakes,
  useConflicts,
  useMaritime,
  useGpsJam,
} from "@/hooks/useOsintData";
import type { StreamMeta } from "@/hooks/useOsintData";
import type {
  Aircraft,
  ConflictEvent,
  Earthquake,
  GpsJamPoint,
  MaritimeData,
  Satellite,
} from "@/lib/osint-services";
import { connectAIS, disconnectAIS } from "@/lib/ais-stream";

import { type CorrelationEvent, detectCorrelations } from "@/lib/correlation-engine";

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
  maritime: StreamSlice<MaritimeData>;
  gpsJam: StreamSlice<GpsJamPoint>;
  correlations: CorrelationEvent[];
}

const OsintDataContext = createContext<OsintSnapshot | null>(null);

export function OsintDataProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    connectAIS();
    return () => disconnectAIS();
  }, []);

  const aircraft = useAircraft();
  const satellites = useSatellites();
  const earthquakes = useEarthquakes();
  const conflicts = useConflicts();
  const maritime = useMaritime();
  const gpsJam = useGpsJam();

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
      maritime: {
        data: maritime.data,
        loading: maritime.loading,
        meta: maritime.meta,
      },
      gpsJam: {
        data: gpsJam.data,
        loading: gpsJam.loading,
        meta: gpsJam.meta,
      },
      correlations: [],
    }),
    [aircraft, satellites, earthquakes, conflicts, maritime, gpsJam],
  );
  
  // Calculate correlations (will memoize/throttle internally)
  if (value.aircraft.data.length || value.conflicts.data.length || value.gpsJam.data.length || value.maritime.data.length) {
    value.correlations = detectCorrelations(value);
  }

  return <OsintDataContext.Provider value={value}>{children}</OsintDataContext.Provider>;
}

export function useOsintSnapshot(): OsintSnapshot {
  const ctx = useContext(OsintDataContext);
  if (!ctx) throw new Error("useOsintSnapshot must be used inside OsintDataProvider");
  return ctx;
}
