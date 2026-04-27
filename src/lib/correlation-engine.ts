import type { OsintSnapshot } from "@/contexts/OsintDataContext";
import type { SelectedEntity } from "@/contexts/SelectionContext";

export interface CorrelationEvent {
  id: string;
  type: string;
  score: number;
  description: string;
  primaryEntity?: SelectedEntity;
  relatedEntities: { lat: number; lon: number }[];
}

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

let lastRunTime = 0;
let cachedCorrelations: CorrelationEvent[] = [];

export function detectCorrelations(osint: OsintSnapshot): CorrelationEvent[] {
  const now = performance.now();
  // Throttle to run max once per 60s
  if (now - lastRunTime < 60000 && cachedCorrelations.length > 0) {
    return cachedCorrelations;
  }
  
  lastRunTime = now;
  const correlations: CorrelationEvent[] = [];

  // 1. Aircraft near conflict + GPS jamming
  const conflicts = osint.conflicts.data;
  const jams = osint.gpsJam.data;
  const aircraft = osint.aircraft.data;
  const maritime = osint.maritime.data;

  // We cap processing to avoid lag
  for (let i = 0; i < Math.min(conflicts.length, 50); i++) {
    const c = conflicts[i]!;
    
    // Rule: AIS-dark vessel near conflict
    const darkVessels = maritime.filter(v => (v.darkMinutes ?? 0) > 30 && distanceKm(c.lat, c.lon, v.lat, v.lon) < 500);
    if (darkVessels.length > 0) {
      correlations.push({
        id: `dark-vessel-conflict-${c.id}`,
        type: 'DARK VESSEL PROXIMITY',
        score: 60 + Math.min(darkVessels.length * 5, 20),
        description: `${darkVessels.length} dark vessel(s) within 500km of conflict zone: ${c.eventType} in ${c.country}`,
        primaryEntity: { type: 'conflict', id: c.id, lat: c.lat, lon: c.lon, data: c as any, selectedAt: new Date() },
        relatedEntities: darkVessels.map(v => ({ lat: v.lat, lon: v.lon }))
      });
    }

    // Rule: Aircraft near conflict AND jamming
    const nearbyJams = jams.filter(j => distanceKm(c.lat, c.lon, j.lat, j.lon) < 500);
    if (nearbyJams.length > 0) {
      const nearbyAir = aircraft.filter(a => distanceKm(c.lat, c.lon, a.latitude, a.longitude) < 500);
      if (nearbyAir.length > 0) {
        correlations.push({
          id: `air-jam-conflict-${c.id}`,
          type: 'COMPOUND THREAT',
          score: 75 + Math.min(nearbyAir.length, 25),
          description: `${nearbyAir.length} aircraft near active conflict and GPS jamming in ${c.country}`,
          primaryEntity: { type: 'conflict', id: c.id, lat: c.lat, lon: c.lon, data: c as any, selectedAt: new Date() },
          relatedEntities: [...nearbyAir.map(a => ({ lat: a.latitude, lon: a.longitude })), ...nearbyJams.map(j => ({ lat: j.lat, lon: j.lon }))]
        });
      }
    }
  }

  // Rule: High aircraft density near jamming zone
  for (let i = 0; i < Math.min(jams.length, 50); i++) {
    const j = jams[i]!;
    if (j.level >= 2) {
      const nearbyAir = aircraft.filter(a => distanceKm(j.lat, j.lon, a.latitude, a.longitude) < 300);
      if (nearbyAir.length > 5) {
        correlations.push({
          id: `air-jam-${j.lat}-${j.lon}`,
          type: 'JAMMING EXPOSURE',
          score: 50 + Math.min(nearbyAir.length, 25),
          description: `${nearbyAir.length} aircraft exposed to L${j.level} jamming`,
          primaryEntity: { type: 'gpsjam', id: `${j.lat}-${j.lon}`, lat: j.lat, lon: j.lon, data: j as any, selectedAt: new Date() },
          relatedEntities: nearbyAir.map(a => ({ lat: a.latitude, lon: a.longitude }))
        });
      }
    }
  }

  correlations.sort((a, b) => b.score - a.score);
  cachedCorrelations = correlations.slice(0, 3); // top 3
  return cachedCorrelations;
}
