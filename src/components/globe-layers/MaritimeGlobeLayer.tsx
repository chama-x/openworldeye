import type { MarkerLike } from "@/components/CommandGlobe";
import type { MaritimeData } from "@/lib/osint-services";
import { THREAT } from "@/lib/threat-colors";

function shipTypeLabel(code: number): string {
  if (code === 35) return "Military";
  if (code >= 70 && code <= 79) return "Cargo";
  if (code >= 80 && code <= 89) return "Tanker";
  if (code >= 30 && code <= 39) return "Fishing/towing";
  return `Type ${code}`;
}

function maritimeColor(shipType: number): string {
  if (shipType >= 70 && shipType <= 79) return THREAT.INTEL;
  if (shipType >= 80 && shipType <= 89) return "#FF9500";
  if (shipType === 35) return THREAT.CRITICAL;
  return "#6b7280";
}

function sizeFromSog(sog: number): number {
  const s = Math.max(0, sog);
  return 0.22 + Math.min(0.2, s / 40);
}

export function maritimeToMarkers(data: MaritimeData[]): MarkerLike[] {
  return data.map((v) => ({
    lat: v.lat,
    lng: v.lon,
    altitude: 0.008,
    size: sizeFromSog(v.sog),
    color: maritimeColor(v.shipType),
    label: `${v.name} · MMSI ${v.mmsi} · ${v.sog.toFixed(1)} kn · ${shipTypeLabel(v.shipType)}`,
    category: "MARITIME",
    raw: v,
  }));
}
