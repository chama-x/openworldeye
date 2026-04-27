import type { MarkerLike } from "@/components/CommandGlobe";
import type { ConflictEvent } from "@/lib/osint-services";
import { conflictEventTypeColor } from "@/lib/threat-colors";

export interface ConflictRingDatum {
  lat: number;
  lng: number;
  maxR: number;
  propagationSpeed: number;
  repeatPeriod: number;
  color: string;
}

function conflictSizeFromFatalities(fatalities: number): number {
  const f = Math.max(0, fatalities);
  if (f >= 50) return 0.62;
  if (f >= 20) return 0.52;
  if (f >= 5) return 0.42;
  if (f >= 1) return 0.34;
  return 0.26;
}

function truncateNotes(notes: string, max = 120): string {
  const t = notes.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

export function buildConflictMarkers(events: ConflictEvent[]): {
  markers: MarkerLike[];
  rings: ConflictRingDatum[];
} {
  const markers: MarkerLike[] = events.map((c) => {
    const size = conflictSizeFromFatalities(c.fatalities);
    const color = conflictEventTypeColor(c.eventType);
    const notesShort = truncateNotes(c.notes);
    return {
      lat: c.lat,
      lng: c.lon,
      altitude: 0.012,
      size,
      color,
      label: `${c.eventType} · ${c.country} · ${c.date} · F:${c.fatalities} — ${notesShort}`,
      category: "CONFLICT",
      raw: c,
    };
  });

  const rings: ConflictRingDatum[] = markers.map((m) => ({
    lat: m.lat,
    lng: m.lng,
    maxR: m.size * 8,
    propagationSpeed: 2,
    repeatPeriod: 1800,
    color: m.color,
  }));

  return { markers, rings };
}
