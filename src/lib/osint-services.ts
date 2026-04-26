/**
 * OSINT Data Services
 * Real-time intelligence data fetchers from public APIs
 *
 * Sources:
 * - OpenSky Network (aircraft positions)
 * - CelesTrak (satellite TLE data)
 * - USGS (earthquakes)
 * - NASA FIRMS (active fires/explosions)
 * - GDELT Project (global events)
 */

import * as satellite from "satellite.js";

// ============================================================
// TYPE DEFINITIONS
// ============================================================

/** live = network OK; fallback = error path sample data; static = bundled sample (no network) */
export type FeedSource = "live" | "fallback" | "static";

export interface DataFeedResult<T> {
  records: T[];
  source: FeedSource;
  /** Human-readable reason when source is fallback */
  errorMessage?: string;
}

export interface Aircraft {
  icao24: string;
  callsign: string;
  origin_country: string;
  longitude: number;
  latitude: number;
  altitude: number; // meters
  velocity: number; // m/s
  heading: number; // degrees
  on_ground: boolean;
}

export interface Satellite {
  name: string;
  noradId: string;
  longitude: number;
  latitude: number;
  altitude: number; // km
  velocity?: number;
}

export interface Earthquake {
  id: string;
  magnitude: number;
  place: string;
  longitude: number;
  latitude: number;
  depth: number;
  time: number;
  url: string;
}

export interface ConflictEvent {
  id: string;
  type: string;
  description: string;
  longitude: number;
  latitude: number;
  time: number;
  severity: "low" | "medium" | "high";
}

// ============================================================
// AIRCRAFT - OpenSky Network
// ============================================================

export async function fetchAircraft(bbox?: {
  lamin: number;
  lomin: number;
  lamax: number;
  lomax: number;
}): Promise<DataFeedResult<Aircraft>> {
  const params = bbox
    ? `?lamin=${bbox.lamin}&lomin=${bbox.lomin}&lamax=${bbox.lamax}&lomax=${bbox.lomax}`
    : "";
  const url = `https://opensky-network.org/api/states/all${params}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`OpenSky returned ${res.status}`);
    const data = await res.json();
    if (!data.states) {
      return { records: [], source: "live" };
    }

    const records = data.states
      .filter((s: (number | string | boolean | null)[]) => s[5] !== null && s[6] !== null)
      .slice(0, 500)
      .map((s: (number | string | boolean | null)[]) => ({
        icao24: s[0],
        callsign: String(s[1] || "").trim() || "UNKN",
        origin_country: String(s[2] || "Unknown"),
        longitude: s[5],
        latitude: s[6],
        altitude: s[7] || 0,
        velocity: s[9] || 0,
        heading: s[10] || 0,
        on_ground: s[8] || false,
      })) as Aircraft[];

    return { records, source: "live" };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Network error";
    console.warn("[OpenSky] Fetch failed, returning sample data:", error);
    return {
      records: generateSampleAircraft(),
      source: "fallback",
      errorMessage: msg,
    };
  }
}

function generateSampleAircraft(): Aircraft[] {
  const samples = [
    { lat: 40.6413, lon: -73.7781, c: "JFK", co: "United States" },
    { lat: 51.47, lon: -0.4543, c: "LHR", co: "United Kingdom" },
    { lat: 35.5494, lon: 139.7798, c: "HND", co: "Japan" },
    { lat: 25.2532, lon: 55.3657, c: "DXB", co: "United Arab Emirates" },
    { lat: 1.3644, lon: 103.9915, c: "SIN", co: "Singapore" },
    { lat: 48.3538, lon: 11.7861, c: "MUC", co: "Germany" },
    { lat: -33.9399, lon: 151.1753, c: "SYD", co: "Australia" },
    { lat: 19.0896, lon: 72.8656, c: "BOM", co: "India" },
    { lat: 39.5098, lon: 116.4105, c: "PEK", co: "China" },
    { lat: 33.6407, lon: -84.4277, c: "ATL", co: "United States" },
    { lat: 49.0097, lon: 2.5479, c: "CDG", co: "France" },
    { lat: -23.4356, lon: -46.4731, c: "GRU", co: "Brazil" },
  ];

  const aircraft: Aircraft[] = [];
  samples.forEach((s, i) => {
    for (let j = 0; j < 8; j++) {
      aircraft.push({
        icao24: `SAMP${i}${j}`,
        callsign: `${s.c}${100 + j}`,
        origin_country: s.co,
        longitude: s.lon + (Math.random() - 0.5) * 6,
        latitude: s.lat + (Math.random() - 0.5) * 4,
        altitude: 8000 + Math.random() * 4000,
        velocity: 200 + Math.random() * 100,
        heading: Math.random() * 360,
        on_ground: false,
      });
    }
  });
  return aircraft;
}

// ============================================================
// SATELLITES - CelesTrak TLE Data + satellite.js propagation
// ============================================================

const TLE_GROUPS = {
  stations: "https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle",
  starlink: "https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=tle",
  "gps-ops": "https://celestrak.org/NORAD/elements/gp.php?GROUP=gps-ops&FORMAT=tle",
  weather: "https://celestrak.org/NORAD/elements/gp.php?GROUP=weather&FORMAT=tle",
  geo: "https://celestrak.org/NORAD/elements/gp.php?GROUP=geo&FORMAT=tle",
};

interface TleRow {
  name: string;
  tle1: string;
  tle2: string;
}

let cachedTles: TleRow[] | null = null;
let cachedTleMeta: { source: FeedSource; errorMessage?: string } | null = null;

export async function fetchSatelliteTLEs(
  group: keyof typeof TLE_GROUPS = "stations",
  limit = 100,
): Promise<DataFeedResult<TleRow>> {
  if (cachedTles && cachedTles.length > 0 && cachedTleMeta) {
    return {
      records: cachedTles.slice(0, limit),
      source: cachedTleMeta.source,
      errorMessage: cachedTleMeta.errorMessage,
    };
  }

  try {
    const res = await fetch(TLE_GROUPS[group]);
    if (!res.ok) throw new Error(`CelesTrak ${res.status}`);
    const text = await res.text();
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

    const tles: TleRow[] = [];
    for (let i = 0; i < lines.length - 2; i += 3) {
      tles.push({ name: lines[i], tle1: lines[i + 1], tle2: lines[i + 2] });
    }
    cachedTles = tles;
    cachedTleMeta = { source: "live" };
    return { records: tles.slice(0, limit), source: "live" };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Network error";
    console.warn("[CelesTrak] Fetch failed, using sample TLEs:", error);
    const sample = getSampleTLEs();
    cachedTles = sample;
    cachedTleMeta = { source: "fallback", errorMessage: msg };
    return { records: sample.slice(0, limit), source: "fallback", errorMessage: msg };
  }
}

function getSampleTLEs(): TleRow[] {
  return [
    {
      name: "ISS (ZARYA)",
      tle1: "1 25544U 98067A   24001.50000000  .00016717  00000+0  10270-3 0  9991",
      tle2: "2 25544  51.6400 200.0000 0001000   0.0000   0.0000 15.50000000123456",
    },
    {
      name: "HUBBLE SPACE TELESCOPE",
      tle1: "1 20580U 90037B   24001.50000000  .00001000  00000+0  50000-4 0  9990",
      tle2: "2 20580  28.4700 100.0000 0002000   0.0000   0.0000 15.10000000234567",
    },
    {
      name: "STARLINK-1007",
      tle1: "1 44713U 19074A   24001.50000000  .00001000  00000+0  50000-4 0  9990",
      tle2: "2 44713  53.0000 150.0000 0001000   0.0000   0.0000 15.06000000345678",
    },
    {
      name: "GPS BIIR-2",
      tle1: "1 24876U 97035A   24001.50000000  .00000010  00000+0  00000+0 0  9990",
      tle2: "2 24876  55.0000 250.0000 0050000   0.0000   0.0000  2.00560000456789",
    },
    {
      name: "NOAA 19",
      tle1: "1 33591U 09005A   24001.50000000  .00000200  00000+0  10000-3 0  9990",
      tle2: "2 33591  99.2000 50.0000 0014000   0.0000   0.0000 14.12000000567890",
    },
  ];
}

export function propagateSatellites(
  tles: { name: string; tle1: string; tle2: string }[],
  date: Date = new Date(),
): Satellite[] {
  const sats: Satellite[] = [];
  for (const tle of tles) {
    try {
      const satrec = satellite.twoline2satrec(tle.tle1, tle.tle2);
      const positionAndVelocity = satellite.propagate(satrec, date);
      const positionEci = positionAndVelocity.position;
      if (!positionEci || typeof positionEci === "boolean") continue;

      const gmst = satellite.gstime(date);
      const positionGd = satellite.eciToGeodetic(positionEci, gmst);

      const longitude = (satellite.degreesLong(positionGd.longitude) + 540) % 360 - 180;
      const latitude = satellite.degreesLat(positionGd.latitude);
      const altitude = positionGd.height; // km

      if (Number.isFinite(longitude) && Number.isFinite(latitude) && Number.isFinite(altitude)) {
        sats.push({
          name: tle.name,
          noradId: tle.tle1.substring(2, 7).trim(),
          longitude,
          latitude,
          altitude,
        });
      }
    } catch {
      /* skip invalid TLE */
    }
  }
  return sats;
}

// ============================================================
// EARTHQUAKES - USGS Earthquakes (last hour, magnitude >= 2.5)
// ============================================================

export async function fetchEarthquakes(): Promise<DataFeedResult<Earthquake>> {
  const url = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson";
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`USGS ${res.status}`);
    const data = await res.json();
    const records = data.features.map((f: {
      id: string;
      properties: { mag: number; place: string; time: number; url: string };
      geometry: { coordinates: number[] };
    }) => ({
      id: f.id,
      magnitude: f.properties.mag,
      place: f.properties.place,
      longitude: f.geometry.coordinates[0],
      latitude: f.geometry.coordinates[1],
      depth: f.geometry.coordinates[2],
      time: f.properties.time,
      url: f.properties.url,
    }));
    return { records, source: "live" };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Network error";
    console.warn("[USGS] Fetch failed:", error);
    return {
      records: generateSampleEarthquakes(),
      source: "fallback",
      errorMessage: msg,
    };
  }
}

function generateSampleEarthquakes(): Earthquake[] {
  return [
    { id: "s1", magnitude: 5.2, place: "Off coast of Japan", longitude: 142.0, latitude: 38.0, depth: 35, time: Date.now(), url: "" },
    { id: "s2", magnitude: 4.8, place: "Central Turkey", longitude: 35.0, latitude: 38.5, depth: 10, time: Date.now(), url: "" },
    { id: "s3", magnitude: 6.1, place: "Aleutian Islands", longitude: -178.0, latitude: 51.5, depth: 45, time: Date.now(), url: "" },
    { id: "s4", magnitude: 3.9, place: "Southern California", longitude: -117.5, latitude: 33.7, depth: 8, time: Date.now(), url: "" },
    { id: "s5", magnitude: 5.5, place: "Indonesia", longitude: 106.0, latitude: -6.5, depth: 60, time: Date.now(), url: "" },
  ];
}

// ============================================================
// CONFLICT EVENTS - Sample data (ACLED requires registration)
// ============================================================

export function fetchConflictEvents(): DataFeedResult<ConflictEvent> {
  return {
    records: [
      { id: "c1", type: "Air Strike", description: "Reported airstrike activity", longitude: 36.2765, latitude: 33.5138, time: Date.now() - 3600000, severity: "high" },
      { id: "c2", type: "Naval Activity", description: "Increased naval presence", longitude: 122.0, latitude: 24.5, time: Date.now() - 7200000, severity: "medium" },
      { id: "c3", type: "Border Incident", description: "Reported border activity", longitude: 38.0, latitude: 49.0, time: Date.now() - 1800000, severity: "high" },
      { id: "c4", type: "Cyber Attack", description: "Critical infrastructure breach", longitude: -77.0369, latitude: 38.9072, time: Date.now() - 900000, severity: "high" },
      { id: "c5", type: "Civil Unrest", description: "Large-scale protests", longitude: 2.3522, latitude: 48.8566, time: Date.now() - 5400000, severity: "medium" },
      { id: "c6", type: "Maritime Interdiction", description: "Vessel boarding operation", longitude: 50.0, latitude: 26.0, time: Date.now() - 10800000, severity: "medium" },
      { id: "c7", type: "Ground Operation", description: "Reported military movement", longitude: 30.5, latitude: 50.4, time: Date.now() - 600000, severity: "high" },
      { id: "c8", type: "Drone Activity", description: "UAV reconnaissance reported", longitude: 44.0, latitude: 35.5, time: Date.now() - 2400000, severity: "medium" },
    ],
    source: "static",
  };
}
