/**
 * useOsintData - React hooks that bridge OSINT services with the global clock
 * and data-layer state. They cache results, debounce polling, and stay within
 * the documented free-tier budgets:
 *   - OpenSky        : ~1 call / 25 s   → ~3,500 calls/day < 4,000 limit
 *   - CelesTrak TLE  : 1 call / 10 min  → very light
 *   - USGS quakes    : 1 call / 5 min   → no published cap
 *   - ACLED-style    : in-memory only
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchAircraft,
  fetchEarthquakes,
  fetchSatelliteTLEs,
  propagateSatellites,
  fetchConflictEvents,
  type Aircraft,
  type Earthquake,
  type Satellite,
  type ConflictEvent,
} from "@/lib/osint-services";
import { useGlobalClock } from "@/contexts/GlobalClockContext";
import { useDataLayers } from "@/contexts/DataLayersContext";

export function useAircraft() {
  const { isActive, layer } = useDataLayers();
  const [data, setData] = useState<Aircraft[]>([]);
  const [loading, setLoading] = useState(false);
  const lastFetchRef = useRef<number>(0);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const aircraft = await fetchAircraft();
      setData(aircraft);
      lastFetchRef.current = Date.now();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isActive("aircraft")) return;
    refresh();
    const interval = setInterval(refresh, layer("aircraft").pollIntervalSec * 1000);
    return () => clearInterval(interval);
  }, [isActive, layer, refresh]);

  return { data: isActive("aircraft") ? data : [], loading, refresh };
}

export function useSatellites() {
  const { isActive, layer } = useDataLayers();
  const { currentTime } = useGlobalClock();
  const [tles, setTles] = useState<{ name: string; tle1: string; tle2: string }[]>([]);
  const [data, setData] = useState<Satellite[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isActive("satellites")) return;
    let cancelled = false;
    setLoading(true);
    fetchSatelliteTLEs("stations", 60)
      .then((t) => !cancelled && setTles(t))
      .finally(() => !cancelled && setLoading(false));
    const interval = setInterval(() => {
      fetchSatelliteTLEs("stations", 60).then((t) => !cancelled && setTles(t));
    }, layer("satellites").pollIntervalSec * 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isActive, layer]);

  useEffect(() => {
    if (!isActive("satellites") || tles.length === 0) {
      setData([]);
      return;
    }
    setData(propagateSatellites(tles, currentTime));
  }, [tles, currentTime, isActive]);

  return { data, loading };
}

export function useEarthquakes() {
  const { isActive, layer } = useDataLayers();
  const [data, setData] = useState<Earthquake[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchEarthquakes());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isActive("earthquakes")) return;
    refresh();
    const interval = setInterval(refresh, layer("earthquakes").pollIntervalSec * 1000);
    return () => clearInterval(interval);
  }, [isActive, layer, refresh]);

  return { data: isActive("earthquakes") ? data : [], loading, refresh };
}

export function useConflicts() {
  const { isActive } = useDataLayers();
  const [data] = useState<ConflictEvent[]>(() => fetchConflictEvents());
  return { data: isActive("conflicts") ? data : [], loading: false };
}
