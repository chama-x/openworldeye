import type { StreamMeta } from "@/hooks/useOsintData";

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
