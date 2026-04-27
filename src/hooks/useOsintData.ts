/**
 * useOsintData - React hooks that bridge OSINT services with the global clock
 * and data-layer state. Polling respects free-tier / provider limits:
 *   - ADSB.fi        : ~1 call / 8 s + jitter
 *   - CelesTrak TLE  : 1 call / 10 min ± jitter
 *   - USGS quakes    : 1 call / 5 min ± jitter
 *   - ACLED          : 30 min cache + poll ± jitter
 *   - AISStream      : WebSocket + 15 s snapshot ± jitter
 *   - GPSJam         : hourly ± jitter
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchAircraft,
  fetchEarthquakes,
  fetchSatelliteTLEs,
  propagateSatellites,
  fetchConflictEvents,
  fetchMaritimeData,
  fetchGpsJamData,
  type Aircraft,
  type ConflictEvent,
  type Earthquake,
  type GpsJamPoint,
  type MaritimeData,
  type Satellite,
  type FeedSource,
} from "@/lib/osint-services";
import { AIRCRAFT_POLL_INTERVAL_MS } from "@/lib/constants";
import { useGlobalClock } from "@/contexts/GlobalClockContext";
import { useDataLayers } from "@/contexts/DataLayersContext";

export type StreamMetaSource = FeedSource | "idle";

export interface StreamMeta {
  source: StreamMetaSource;
  lastUpdatedAt: number | null;
  errorMessage?: string;
}

const idleMeta: StreamMeta = { source: "idle", lastUpdatedAt: null };

function jitterMs(base: number, pct: number): number {
  const delta = base * pct;
  return base + (Math.random() * 2 - 1) * delta;
}

export function useAircraft() {
  const { isActive } = useDataLayers();
  const [data, setData] = useState<Aircraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState<StreamMeta>(idleMeta);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aircraftMapRef = useRef<Map<string, Aircraft>>(new Map());

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetchAircraft();
      const now = Date.now();
      const map = aircraftMapRef.current;

      // Mark all fresh aircraft
      const seenIds = new Set<string>();
      for (const ac of r.records) {
        seenIds.add(ac.icao24);
        const existing = map.get(ac.icao24);
        const history = existing?.positionHistory ?? [];

        // Append previous position to history if it moved
        if (existing && (existing.latitude !== ac.latitude || existing.longitude !== ac.longitude)) {
          history.push({
            lat: existing.latitude,
            lon: existing.longitude,
            alt: existing.altitude,
            t: now,
          });
          if (history.length > 30) history.shift();
        }

        map.set(ac.icao24, {
          ...ac,
          prevLat: existing?.latitude,
          prevLon: existing?.longitude,
          lastSeenMs: now,
          positionHistory: history,
        });
      }

      // Prune aircraft not seen in last 60s
      map.forEach((ac, hex) => {
        if (now - (ac.lastSeenMs ?? 0) > 60000) map.delete(hex);
      });

      // Stable sort so array order never shuffles
      const sorted = Array.from(map.values()).sort((a, b) =>
        a.icao24.localeCompare(b.icao24),
      );
      setData(sorted);
      setMeta({
        source: r.source,
        lastUpdatedAt: now,
        errorMessage: r.errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isActive("aircraft")) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      return;
    }
    let cancelled = false;

    const scheduleNext = () => {
      if (cancelled) return;
      const delay = AIRCRAFT_POLL_INTERVAL_MS + Math.random() * 3000 - 1500;
      timeoutRef.current = setTimeout(async () => {
        await refresh();
        scheduleNext();
      }, Math.max(2000, delay));
    };

    void refresh().then(() => {
      if (!cancelled) scheduleNext();
    });

    return () => {
      cancelled = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    };
  }, [isActive, refresh]);

  return {
    data: isActive("aircraft") ? data : [],
    loading: isActive("aircraft") && loading,
    refresh,
    meta: isActive("aircraft") ? meta : idleMeta,
  };
}

export function useSatellites() {
  const { isActive, layer } = useDataLayers();
  const { currentTime } = useGlobalClock();
  const [tles, setTles] = useState<{ name: string; tle1: string; tle2: string }[]>([]);
  const [data, setData] = useState<Satellite[]>([]);
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState<StreamMeta>(idleMeta);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isActive("satellites")) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      return;
    }
    let cancelled = false;
    const baseSec = layer("satellites").pollIntervalSec * 1000;

    const runFetch = (): Promise<void> => {
      if (cancelled) return Promise.resolve();
      setLoading(true);
      return fetchSatelliteTLEs("stations", 60)
        .then((r) => {
          if (cancelled) return;
          setTles(r.records);
          setMeta({
            source: r.source,
            lastUpdatedAt: Date.now(),
            errorMessage: r.errorMessage,
          });
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    };

    const scheduleLoop = () => {
      if (cancelled) return;
      const delay = jitterMs(baseSec, 0.125);
      timeoutRef.current = setTimeout(() => {
        void runFetch().then(() => {
          if (!cancelled) scheduleLoop();
        });
      }, delay);
    };

    void runFetch().then(() => {
      if (!cancelled) scheduleLoop();
    });

    return () => {
      cancelled = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    };
  }, [isActive, layer]);

  useEffect(() => {
    if (!isActive("satellites") || tles.length === 0) {
      setData([]);
      return;
    }
    setData(propagateSatellites(tles, currentTime));
  }, [tles, currentTime, isActive]);

  return {
    data: isActive("satellites") ? data : [],
    loading: isActive("satellites") && loading,
    meta: isActive("satellites") ? meta : idleMeta,
  };
}

export function useEarthquakes() {
  const { isActive, layer } = useDataLayers();
  const [data, setData] = useState<Earthquake[]>([]);
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState<StreamMeta>(idleMeta);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetchEarthquakes();
      setData(r.records);
      setMeta({
        source: r.source,
        lastUpdatedAt: Date.now(),
        errorMessage: r.errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isActive("earthquakes")) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      return;
    }
    let cancelled = false;
    const baseSec = layer("earthquakes").pollIntervalSec * 1000;

    const scheduleNext = () => {
      if (cancelled) return;
      const delay = jitterMs(baseSec, 0.125);
      timeoutRef.current = setTimeout(async () => {
        await refresh();
        scheduleNext();
      }, delay);
    };

    void refresh().then(() => {
      if (!cancelled) scheduleNext();
    });

    return () => {
      cancelled = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    };
  }, [isActive, layer, refresh]);

  return {
    data: isActive("earthquakes") ? data : [],
    loading: isActive("earthquakes") && loading,
    refresh,
    meta: isActive("earthquakes") ? meta : idleMeta,
  };
}

export function useConflicts() {
  const { isActive, layer } = useDataLayers();
  const [data, setData] = useState<ConflictEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState<StreamMeta>(idleMeta);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetchConflictEvents();
      setData(r.records);
      setMeta({
        source: r.source,
        lastUpdatedAt: Date.now(),
        errorMessage: r.errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isActive("conflicts")) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      return;
    }
    let cancelled = false;
    const baseSec = layer("conflicts").pollIntervalSec * 1000;

    const scheduleNext = () => {
      if (cancelled) return;
      const delay = jitterMs(baseSec, 0.125);
      timeoutRef.current = setTimeout(async () => {
        await refresh();
        scheduleNext();
      }, delay);
    };

    void refresh().then(() => {
      if (!cancelled) scheduleNext();
    });

    return () => {
      cancelled = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    };
  }, [isActive, layer, refresh]);

  return {
    data: isActive("conflicts") ? data : [],
    loading: isActive("conflicts") && loading,
    meta: isActive("conflicts") ? meta : idleMeta,
  };
}

export function useMaritime() {
  const { isActive } = useDataLayers();
  const [data, setData] = useState<MaritimeData[]>([]);
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState<StreamMeta>(idleMeta);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const r = fetchMaritimeData();
      setData(r.records);
      setMeta({
        source: r.source,
        lastUpdatedAt: Date.now(),
        errorMessage: r.errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isActive("maritime")) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      return;
    }
    let cancelled = false;

    const scheduleNext = () => {
      if (cancelled) return;
      const delay = 15000 + Math.random() * 10000 - 5000;
      timeoutRef.current = setTimeout(async () => {
        await refresh();
        scheduleNext();
      }, Math.max(3000, delay));
    };

    void refresh().then(() => {
      if (!cancelled) scheduleNext();
    });

    return () => {
      cancelled = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    };
  }, [isActive, refresh]);

  return {
    data: isActive("maritime") ? data : [],
    loading: isActive("maritime") && loading,
    meta: isActive("maritime") ? meta : idleMeta,
  };
}

export function useGpsJam() {
  const { isActive, layer } = useDataLayers();
  const [data, setData] = useState<GpsJamPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState<StreamMeta>(idleMeta);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetchGpsJamData();
      setData(r.records);
      setMeta({
        source: r.source,
        lastUpdatedAt: Date.now(),
        errorMessage: r.errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isActive("gpsjam")) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      return;
    }
    let cancelled = false;
    const baseSec = layer("gpsjam").pollIntervalSec * 1000;

    const scheduleNext = () => {
      if (cancelled) return;
      const delay = jitterMs(baseSec, 0.125);
      timeoutRef.current = setTimeout(async () => {
        await refresh();
        scheduleNext();
      }, delay);
    };

    void refresh().then(() => {
      if (!cancelled) scheduleNext();
    });

    return () => {
      cancelled = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    };
  }, [isActive, layer, refresh]);

  return {
    data: isActive("gpsjam") ? data : [],
    loading: isActive("gpsjam") && loading,
    meta: isActive("gpsjam") ? meta : idleMeta,
  };
}
