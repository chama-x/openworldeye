/**
 * threat-colors.ts
 * Unified semantic colour language across all OSINT layers.
 * Colours chosen for subconscious pre-attentive processing:
 *   green  = nominal/safe, amber = watch, orange = elevated,
 *   red    = critical/immediate, blue = intel asset, purple = infrastructure
 */

export const THREAT = {
  NONE: "#00FF9C",
  MONITOR: "#FFB800",
  ELEVATED: "#FF6B00",
  CRITICAL: "#FF3333",
  INTEL: "#7DD3FC",
  INFRA: "#A78BFA",
} as const;

/** Aircraft: altitude-coded colour. Higher = brighter green. Low altitude = amber flag. */
export function aircraftColor(altitudeMetres: number): string {
  if (altitudeMetres > 10000) return "#00FF9C";
  if (altitudeMetres > 3000) return "#7DFFC4";
  if (altitudeMetres > 0) return "#FFB800";
  return "#FF6B00"; // ground or unknown
}

/** Earthquake: magnitude-coded colour. */
export function seismicColor(magnitude: number): string {
  if (magnitude >= 6.5) return "#FF3333";
  if (magnitude >= 5.0) return "#FF6B00";
  if (magnitude >= 3.5) return "#FFB800";
  return "rgba(255,184,0,0.45)";
}

/** Conflict: severity-coded colour (legacy chips). */
export function conflictColor(severity: "high" | "medium" | "low"): string {
  if (severity === "high") return "#FF3333";
  if (severity === "medium") return "#FF6B00";
  return "#FFB800";
}

/** ACLED event_type → display colour. */
export function conflictEventTypeColor(eventType: string): string {
  const t = eventType.trim();
  if (t === "Battles") return "#FF3333";
  if (t === "Explosions/Remote violence") return "#FF6B00";
  if (t === "Violence against civilians") return "#FF9500";
  if (t === "Protests") return "#FFB800";
  if (t === "Riots") return "#E6A800";
  return "#8899aa";
}
