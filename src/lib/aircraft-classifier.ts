export type AircraftCategory =
  | "widebody"
  | "narrowbody"
  | "regional"
  | "bizjet"
  | "general"
  | "military"
  | "helicopter"
  | "unknown";

/** Instanced fleet uses merged geometries — keys map to `globe-aircraft-geometry-bank`. */
export type SpecificGlobeModelKey = "b777" | "b737" | "a320" | "atr72" | "e190";

export function classifyAircraft(typeCode: string | undefined): AircraftCategory {
  if (!typeCode) return "unknown";
  const t = typeCode.toUpperCase().trim();

  if (/^B7[47]|^B78|^A3[3-9]|^A38/.test(t)) return "widebody";

  if (/^B73|^A31|^A32|^A22|^B75/.test(t)) return "narrowbody";

  if (/^E1[7-9]|^E29|^CRJ|^AT[467R]|^DH[8C]|^SF3|^JS4/.test(t)) return "regional";

  if (/^GL[5-7]|^C56|^C68|^F2|^LJ|^BE4|^PC1|^E55/.test(t)) return "bizjet";

  if (/^H6|^EC[13]|^AS3|^AW1|^R44|^S76|^B06/.test(t)) return "helicopter";

  if (/^F1[56]|^F22|^F35|^C17|^C130|^KC|^P8|^E3/.test(t)) return "military";

  if (/^C1[57]|^C172|^PA[23]|^BE3|^SR2|^DA4/.test(t)) return "general";

  return "unknown";
}

export function getModelScaleForCategory(category: AircraftCategory): number {
  switch (category) {
    case "widebody":
      return 1.4;
    case "narrowbody":
      return 1.0;
    case "regional":
      return 0.75;
    case "bizjet":
      return 0.6;
    case "general":
      return 0.35;
    case "military":
      return 0.9;
    case "helicopter":
      return 0.4;
    case "unknown":
      return 0.85;
  }
}

/** Globe / panel tint for generic silhouette (military must stay #ef4444). */
export const CATEGORY_SILHOUETTE_HEX: Record<AircraftCategory, string> = {
  widebody: "#e2e8f0",
  narrowbody: "#cbd5e1",
  regional: "#94a3b8",
  bizjet: "#7dd3fc",
  general: "#6b7280",
  military: "#ef4444",
  helicopter: "#f59e0b",
  unknown: "#ffffff",
};

/**
 * Picks a detailed mesh when the ICAO type string matches; otherwise null → generic procedural silhouette.
 * Widebody ICAO codes are checked before narrowbody A32* so A330 uses a widebody mesh, not A320.
 */
export function pickSpecificGlobeModel(typeCode: string | undefined): SpecificGlobeModelKey | null {
  const t = typeCode?.trim().toUpperCase() ?? "";
  if (!t) return null;

  if (t.includes("777") || /^B74|^B77|^B78|^B79/.test(t)) return "b777";
  if (/^A33|^A34|^A35|^A38/.test(t)) return "b777";

  if (t.startsWith("B73") || t.includes("737")) return "b737";

  if (t.startsWith("A32") || t.startsWith("A31")) return "a320";

  if (t.startsWith("AT7") || t.startsWith("ATR") || t.includes("ATR") || /^AT[467]/.test(t)) return "atr72";

  if (t.startsWith("E19") || t.startsWith("E17") || t.includes("E190") || /^E75/.test(t)) return "e190";

  return null;
}

export interface ResolvedAircraftVisual {
  category: AircraftCategory;
  specificModel: SpecificGlobeModelKey | null;
  categoryScale: number;
  silhouetteColor: string;
}

/** Single source of truth for globe instancing + UI picker (scale, color, model key). */
export function resolveAircraftVisual(ac: { typeCode?: string }): ResolvedAircraftVisual {
  const category = classifyAircraft(ac.typeCode);
  const categoryScale = getModelScaleForCategory(category);
  const specificModel = pickSpecificGlobeModel(ac.typeCode);
  return {
    category,
    specificModel,
    categoryScale,
    silhouetteColor: CATEGORY_SILHOUETTE_HEX[category],
  };
}
