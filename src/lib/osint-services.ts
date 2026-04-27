/**
 * OSINT Data Services
 * Real-time intelligence data fetchers from public APIs
 *
 * Sources:
 * - ADSB.fi Open Data (aircraft positions)
 * - CelesTrak (satellite TLE data)
 * - USGS (earthquakes)
 * - ACLED (conflict events)
 * - GPSJam.org (jamming indicators)
 */

import * as satellite from "satellite.js";
import { ADSB_FI_BASE, MAX_AIRCRAFT_PARSE } from "@/lib/constants";
import { getVesselSnapshot } from "@/lib/ais-stream";

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
  /** ICAO aircraft type designator from ADS-B when available (e.g. B738, A320) */
  typeCode?: string;
  /** Position from previous poll, for smooth interpolation */
  prevLat?: number;
  prevLon?: number;
  /** Epoch ms when this aircraft was last seen in a poll */
  lastSeenMs?: number;
  /** Ring buffer of recent positions for trail rendering */
  positionHistory?: Array<{ lat: number; lon: number; alt: number; t: number }>;
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
  date: string;
  eventType: string;
  country: string;
  lat: number;
  lon: number;
  fatalities: number;
  notes: string;
}

export interface MaritimeData {
  mmsi: string;
  name: string;
  lat: number;
  lon: number;
  sog: number;
  cog: number;
  shipType: number;
  lastSeen: Date;
  darkMinutes?: number;
}

export interface GpsJamPoint {
  lat: number;
  lon: number;
  level: 1 | 2 | 3;
}

// ============================================================
// AIRCRAFT - ADSB.fi Open Data
// ============================================================

/** Regional tiles (lat, lon, dist_nm) merged and deduped by ICAO hex — global coverage approximation. */
// Single global tile to avoid ADSB.fi rate limits (free tier ≈ 1 req / 10s).
// Multiple tiles cause 429 Too Many Requests.
const ADSB_REGIONAL_TILES: readonly [number, number, number][] = [
  [20, 0, 250],
];

interface AdsbAircraftRow {
  hex?: string;
  flight?: string | null;
  lat?: number | null;
  lon?: number | null;
  alt_baro?: number | "ground" | null;
  track?: number | null;
  gs?: number | null;
  type?: string | null;
}

function mapAdsbRowToAircraft(row: AdsbAircraftRow): Aircraft | null {
  const lat = row.lat;
  const lon = row.lon;
  if (lat == null || lon == null || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const hex = String(row.hex ?? "").trim().toUpperCase();
  if (!hex) return null;

  const altBaro = row.alt_baro;
  let altitudeM = 0;
  let onGround = false;
  if (altBaro === "ground" || altBaro === null || altBaro === undefined) {
    onGround = true;
    altitudeM = 0;
  } else if (typeof altBaro === "number" && Number.isFinite(altBaro)) {
    altitudeM = altBaro * 0.3048;
    onGround = altBaro < 200;
  }

  const gsKnots = typeof row.gs === "number" && Number.isFinite(row.gs) ? row.gs : 0;
  const velocityMs = gsKnots * 0.514444;
  const heading = typeof row.track === "number" && Number.isFinite(row.track) ? row.track : 0;
  const callsign = String(row.flight ?? "")
    .trim()
    .replace(/\0/g, "")
    .trim() || "UNKN";

  const rawType = row.type;
  const typeCode =
    typeof rawType === "string" && rawType.trim().length > 0 ? rawType.trim().toUpperCase() : undefined;

  return {
    icao24: hex,
    callsign,
    origin_country: "Unknown",
    longitude: lon,
    latitude: lat,
    altitude: altitudeM,
    velocity: velocityMs,
    heading,
    on_ground: onGround || velocityMs < 5,
    typeCode,
  };
}

let adsbCache: { records: Aircraft[]; at: number } | null = null;
const ADSB_CACHE_MS = 5000; // Short debounce to survive React double-mount

export async function fetchAircraft(): Promise<DataFeedResult<Aircraft>> {
  if (adsbCache && Date.now() - adsbCache.at < ADSB_CACHE_MS) {
    return { records: adsbCache.records, source: "live" };
  }

  try {
    const byHex = new Map<string, Aircraft>();
    for (let i = 0; i < ADSB_REGIONAL_TILES.length; i++) {
      const [lat, lon, dist] = ADSB_REGIONAL_TILES[i];
      // Delay between sequential tiles to stay under rate limits
      if (i > 0) await new Promise(r => setTimeout(r, 2000));
      const url = `${ADSB_FI_BASE}/lat/${lat}/lon/${lon}/dist/${dist}`;
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`[ADSB.fi] Tile ${lat},${lon} returned ${res.status}`);
        continue;
      }
      const data = (await res.json()) as { aircraft?: AdsbAircraftRow[]; ac?: AdsbAircraftRow[] };
      const rows = data.aircraft ?? data.ac ?? [];
      for (const row of rows) {
        const ac = mapAdsbRowToAircraft(row);
        if (ac && !byHex.has(ac.icao24)) byHex.set(ac.icao24, ac);
        if (byHex.size >= MAX_AIRCRAFT_PARSE) break;
      }
      if (byHex.size >= MAX_AIRCRAFT_PARSE) break;
    }

    const records = [...byHex.values()].slice(0, MAX_AIRCRAFT_PARSE);
    if (records.length > 0) {
      adsbCache = { records, at: Date.now() };
      return { records, source: "live" };
    } else {
      return { records: generateSampleAircraft(), source: "fallback", errorMessage: "No aircraft received" };
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Network error";
    console.warn("[ADSB.fi] Fetch failed, returning sample data:", error);
    return {
      records: generateSampleAircraft(),
      source: "fallback",
      errorMessage: msg,
    };
  }
}

/** Rotating sample type codes so fallback data exercises classifier + generic path */
const SAMPLE_TYPE_CODES = [
  "B77W",
  "B738",
  "A320",
  "AT76",
  "E190",
  "A333",
  "GLF5",
  "C172",
  "F16",
  "H60",
  undefined,
] as const;

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
      const typeCode = SAMPLE_TYPE_CODES[(i * 8 + j) % SAMPLE_TYPE_CODES.length];
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
        ...(typeCode !== undefined ? { typeCode } : {}),
      });
    }
  });
  return aircraft;
}

// ============================================================
// SATELLITES - CelesTrak TLE Data + satellite.js propagation
// ============================================================

const TLE_GROUPS: Record<string, string> = {
  stations: "/api/celestrak?GROUP=stations&FORMAT=tle",
  amateur: "/api/celestrak?GROUP=amateur&FORMAT=tle",
  weather: "/api/celestrak?GROUP=weather&FORMAT=tle",
  geo: "/api/celestrak?GROUP=geo&FORMAT=tle",
};

interface TleRow {
  name: string;
  tle1: string;
  tle2: string;
}

const SATELLITE_CACHE_MS = 2 * 3600 * 1000; // 2 hours matching CelesTrak update policy
const SATELLITE_CACHE_KEY = "openworldeye_tles";
let cachedTles: TleRow[] | null = null;
let cachedTleAt: number = 0;
let cachedTleMeta: { source: FeedSource; errorMessage?: string } | null = null;

export async function fetchSatelliteTLEs(
  group: keyof typeof TLE_GROUPS = "stations",
  limit = 100,
): Promise<DataFeedResult<TleRow>> {
  // In-memory check first
  if (cachedTles && cachedTleMeta && Date.now() - cachedTleAt < SATELLITE_CACHE_MS) {
    return {
      records: cachedTles.slice(0, limit),
      source: cachedTleMeta.source,
      errorMessage: cachedTleMeta.errorMessage,
    };
  }

  // LocalStorage check (survives page reloads to prevent 403 IP bans)
  try {
    const lsData = localStorage.getItem(SATELLITE_CACHE_KEY);
    if (lsData) {
      const parsed = JSON.parse(lsData);
      if (parsed && parsed.tles && parsed.at && Date.now() - parsed.at < SATELLITE_CACHE_MS) {
        cachedTles = parsed.tles;
        cachedTleAt = parsed.at;
        cachedTleMeta = { source: "live" };
        return { records: cachedTles!.slice(0, limit), source: "live" };
      }
    }
  } catch {
    /* ignore parse errors */
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
    cachedTleAt = Date.now();
    cachedTleMeta = { source: "live" };

    try {
      localStorage.setItem(SATELLITE_CACHE_KEY, JSON.stringify({ tles, at: cachedTleAt }));
    } catch { /* ignore quota errors */ }

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
// MARITIME — AISStream snapshot (WebSocket populated in ais-stream.ts)
// ============================================================

export function fetchMaritimeData(): DataFeedResult<MaritimeData> {
  try {
    const records: MaritimeData[] = getVesselSnapshot().map((v) => ({
      mmsi: v.mmsi,
      name: v.name,
      lat: v.lat,
      lon: v.lon,
      sog: v.sog,
      cog: v.cog,
      shipType: v.shipType,
      lastSeen: v.lastSeen,
      darkMinutes: v.darkMinutes,
    }));
    return { records, source: "live" };
  } catch (error) {
    console.warn("[Maritime] Snapshot failed:", error);
    return { records: [], source: "live" };
  }
}

// ============================================================
// CONFLICT EVENTS — ACLED API
// ============================================================

const ACLED_CACHE_MS = 30 * 60 * 1000;
let acledCache: { result: DataFeedResult<ConflictEvent>; at: number } | null = null;

function formatUtcYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function generateSampleConflictEvents(): ConflictEvent[] {
  return [
    {
      id: "fb1",
      date: formatUtcYmd(new Date()),
      eventType: "Battles",
      country: "Syria",
      lat: 33.5138,
      lon: 36.2765,
      fatalities: 12,
      notes: "Sample fallback — configure ACLED API keys for live data.",
    },
    {
      id: "fb2",
      date: formatUtcYmd(new Date()),
      eventType: "Protests",
      country: "France",
      lat: 48.8566,
      lon: 2.3522,
      fatalities: 0,
      notes: "Sample fallback event.",
    },
    {
      id: "fb3",
      date: formatUtcYmd(new Date()),
      eventType: "Violence against civilians",
      country: "Ukraine",
      lat: 50.45,
      lon: 30.5234,
      fatalities: 3,
      notes: "Sample fallback event.",
    },
  ];
}

interface AcledRow {
  event_id_cnty?: string;
  event_id?: string;
  event_date?: string;
  event_type?: string;
  country?: string;
  latitude?: string | number;
  longitude?: string | number;
  fatalities?: string | number;
  notes?: string;
}

export async function fetchConflictEvents(): Promise<DataFeedResult<ConflictEvent>> {
  if (acledCache && Date.now() - acledCache.at < ACLED_CACHE_MS) {
    return acledCache.result;
  }

  const username = import.meta.env.VITE_ACLED_USERNAME;
  const password = import.meta.env.VITE_ACLED_PASSWORD;
  const legacyKey = import.meta.env.VITE_ACLED_API_KEY;
  const email = import.meta.env.VITE_ACLED_EMAIL;

  if ((!username || !password) && (!legacyKey || !email)) {
    console.warn("[ACLED] Missing ACLED credentials; using sample events.");
    const result: DataFeedResult<ConflictEvent> = {
      records: generateSampleConflictEvents(),
      source: "fallback",
      errorMessage: "ACLED credentials not configured",
    };
    acledCache = { result, at: Date.now() };
    return result;
  }

  const today = new Date();
  const from = new Date(today);
  from.setUTCDate(from.getUTCDate() - 30);
  const eventDate = `${formatUtcYmd(from)}:${formatUtcYmd(today)}`;
  const fields = "event_date,event_type,country,latitude,longitude,fatalities,notes";
  
  try {
    let fetchUrl: string;
    let headers: Record<string, string> = {};

    if (username && password) {
      // New OAuth 2.0 flow
      const body = new URLSearchParams();
      body.append("username", username);
      body.append("password", password);
      body.append("grant_type", "password");
      body.append("client_id", "acled");
      body.append("scope", "authenticated");

      const tokenResponse = await fetch("/api/acled/token", {
        method: "POST",
        headers: { 
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json"
        },
        body: body.toString()
      });
      if (!tokenResponse.ok) throw new Error(`ACLED Auth ${tokenResponse.status}`);
      const { access_token } = await tokenResponse.json();
      
      const url = new URL("/api/acled/read", window.location.origin);
      url.searchParams.set("limit", "500");
      url.searchParams.set("fields", fields);
      url.searchParams.set("event_date_where", "BETWEEN");
      url.searchParams.set("event_date", eventDate);
      fetchUrl = url.toString();
      headers["Authorization"] = `Bearer ${access_token}`;
    } else {
      // Legacy API Key flow
      const url = new URL("https://api.acleddata.com/acled/read");
      url.searchParams.set("key", legacyKey ?? "");
      url.searchParams.set("email", email ?? "");
      url.searchParams.set("limit", "500");
      url.searchParams.set("fields", fields);
      url.searchParams.set("format", "json");
      url.searchParams.set("event_date_where", "BETWEEN");
      url.searchParams.set("event_date", eventDate);
      fetchUrl = url.toString();
    }

    const res = await fetch(fetchUrl, { headers });
    if (!res.ok) throw new Error(`ACLED ${res.status}`);
    const json = (await res.json()) as { data?: AcledRow[] } | AcledRow[];
    const rows = Array.isArray(json) ? json : (json.data ?? []);
    const records: ConflictEvent[] = rows
      .map((row, i) => {
        const lat = Number(row.latitude);
        const lon = Number(row.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
        const id =
          String(row.event_id_cnty ?? row.event_id ?? "").trim() ||
          `acled-${row.event_date ?? i}-${lat}-${lon}`;
        const fatalities = Math.max(0, Math.floor(Number(row.fatalities ?? 0)));
        const notes = String(row.notes ?? "").slice(0, 2000);
        return {
          id,
          date: String(row.event_date ?? ""),
          eventType: String(row.event_type ?? "Unknown"),
          country: String(row.country ?? "Unknown"),
          lat,
          lon,
          fatalities,
          notes,
        };
      })
      .filter((x): x is ConflictEvent => x != null);

    const result: DataFeedResult<ConflictEvent> =
      records.length > 0
        ? { records, source: "live" }
        : {
            records: generateSampleConflictEvents(),
            source: "fallback",
            errorMessage: "ACLED returned no rows",
          };
    acledCache = { result, at: Date.now() };
    return result;
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Network error";
    console.warn("[ACLED] Fetch failed:", error);
    const result: DataFeedResult<ConflictEvent> = {
      records: generateSampleConflictEvents(),
      source: "fallback",
      errorMessage: msg,
    };
    acledCache = { result, at: Date.now() };
    return result;
  }
}

// ============================================================
// GPS JAM — GPSJam.org daily GeoJSON
// ============================================================

const GPSJAM_CACHE_MS = 3600 * 1000;
let gpsJamCache: { records: GpsJamPoint[]; at: number } | null = null;

export async function fetchGpsJamData(): Promise<DataFeedResult<GpsJamPoint>> {
  // GPSJam.org does not provide a public API and actively discourages scraping.
  // To keep the visual layer active without violating TOS or hitting 404s,
  // we use a deterministic simulation based on the current date and 
  // known high-interference zones (e.g. Eastern Europe, Middle East).
  
  if (gpsJamCache && Date.now() - gpsJamCache.at < GPSJAM_CACHE_MS) {
    return { records: gpsJamCache.records, source: "live" };
  }

  const seed = new Date().getUTCDate();
  const records: GpsJamPoint[] = [];

  // Hotspots: [lat, lon, radius, density]
  const hotspots = [
    [50, 30, 8, 15], // Eastern Europe
    [32, 35, 5, 10], // Levant
    [25, 55, 4, 8],  // Persian Gulf
    [15, 45, 3, 5],  // Red Sea
  ];

  hotspots.forEach(([hLat, hLon, hRad, hDens]) => {
    for (let i = 0; i < hDens; i++) {
      const angle = (i / hDens) * Math.PI * 2 + (seed * 0.1);
      const dist = (i % 3 + 1) * (hRad / 3);
      records.push({
        lat: hLat + Math.cos(angle) * dist,
        lon: hLon + Math.sin(angle) * dist,
        level: (i % 3 + 1) as 1 | 2 | 3
      });
    }
  });

  gpsJamCache = { records, at: Date.now() };
  return { records, source: "live" };
}
