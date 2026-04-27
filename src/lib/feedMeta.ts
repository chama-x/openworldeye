import type { StreamMeta } from "@/hooks/useOsintData";

/** Catalog of OSINT feeds for docs / about panels. */
export const DATA_FEED_CATALOG = [
  {
    id: "aircraft",
    name: "Aircraft",
    sourceUrl: "https://opendata.adsb.fi/",
    updateIntervalSec: 8,
    dataType: "ADS-B positions",
  },
  {
    id: "satellites",
    name: "Satellites",
    sourceUrl: "https://celestrak.org/",
    updateIntervalSec: 600,
    dataType: "NORAD TLE two-line elements",
  },
  {
    id: "earthquakes",
    name: "Earthquakes",
    sourceUrl: "https://earthquake.usgs.gov/",
    updateIntervalSec: 300,
    dataType: "USGS GeoJSON M2.5+",
  },
  {
    id: "conflicts",
    name: "Conflicts",
    sourceUrl: "https://acleddata.com/",
    updateIntervalSec: 1800,
    dataType: "ACLED event records",
  },
  {
    id: "maritime",
    name: "Maritime AIS",
    sourceUrl: "https://aisstream.io/",
    updateIntervalSec: 15,
    dataType: "AIS PositionReport stream",
  },
  {
    id: "gpsjam",
    name: "GPS jamming",
    sourceUrl: "https://gpsjam.org/",
    updateIntervalSec: 3600,
    dataType: "Daily GeoJSON interference levels",
  },
] as const;

export function formatFeedTimeUtc(ts: number | null): string {
  if (ts == null) return "—";
  return new Date(ts).toISOString().slice(11, 16) + "Z";
}

export function describeFeedSource(meta: StreamMeta): string {
  if (meta.source === "idle") return "off";
  if (meta.source === "live") return "live";
  if (meta.source === "fallback") return "sample";
  return "static";
}

/** One-line for feed strip: `AIR · live · 22:41Z` */
export function feedStripPart(short: string, meta: StreamMeta, loading: boolean): string {
  if (meta.source === "idle") return `${short} · off`;
  const t = formatFeedTimeUtc(meta.lastUpdatedAt);
  const src = describeFeedSource(meta);
  const load = loading ? " …" : "";
  return `${short} · ${src} · ${t}${load}`;
}
