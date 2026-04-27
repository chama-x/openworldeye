import type { MarkerLike } from "@/components/CommandGlobe";
import type { GpsJamPoint } from "@/lib/osint-services";

function levelColor(level: 1 | 2 | 3): string {
  if (level === 1) return "rgba(255,184,0,0.35)";
  if (level === 2) return "rgba(255,107,0,0.5)";
  return "rgba(255,51,51,0.7)";
}

function levelSize(level: 1 | 2 | 3): number {
  if (level === 1) return 0.55;
  if (level === 2) return 0.72;
  return 0.88;
}

export function gpsJamToMarkers(points: GpsJamPoint[]): MarkerLike[] {
  return points.map((p) => ({
    lat: p.lat,
    lng: p.lon,
    altitude: 0.003,
    size: levelSize(p.level),
    color: levelColor(p.level),
    label: `GPS Jamming — Level ${p.level} · ${p.lat.toFixed(2)}°, ${p.lon.toFixed(2)}°`,
    category: "GPSJAM",
    raw: p,
  }));
}
