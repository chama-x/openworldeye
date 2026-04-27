import * as THREE from "three";
import type { GlobeFleetAircraft } from "@/lib/model-geometry-constants";
import { createB737Geometries } from "@/components/models/Boeing737Model";
import { createB777Geometries } from "@/components/models/Boeing777Model";
import { createE190Geometries } from "@/components/models/EmbraerE190Model";
import { createATR72Geometries } from "@/components/models/ATR72Model";
import { createA320Geometries } from "@/components/models/A320Model";
import { createGenericAircraftGeometries } from "@/components/models/GenericAircraftModel";
import type { SpecificGlobeModelKey } from "@/lib/aircraft-classifier";

export type GlobeFleetGeometryKey = SpecificGlobeModelKey | "generic";

const cache: Partial<Record<GlobeFleetGeometryKey, GlobeFleetAircraft>> = {};

function asFleet(g: {
  whiteGeo: THREE.BufferGeometry | null;
  greyGeo: THREE.BufferGeometry | null;
  glassGeo: THREE.BufferGeometry | null;
  propGeo?: THREE.BufferGeometry | null;
}): GlobeFleetAircraft {
  if (!g.whiteGeo || !g.greyGeo || !g.glassGeo) {
    throw new Error("globe aircraft geometry: missing buffer");
  }
  return {
    whiteGeo: g.whiteGeo,
    greyGeo: g.greyGeo,
    glassGeo: g.glassGeo,
    propGeo: g.propGeo ?? undefined,
  };
}

const build: Record<GlobeFleetGeometryKey, () => ReturnType<typeof createB777Geometries>> = {
  b777: () => createB777Geometries("globe"),
  b737: () => createB737Geometries("globe"),
  a320: () => createA320Geometries("globe"),
  atr72: () => createATR72Geometries("globe"),
  e190: () => createE190Geometries("globe"),
  generic: () => {
    const g = createGenericAircraftGeometries("globe");
    return asFleet({ whiteGeo: g.whiteGeo, greyGeo: g.greyGeo, glassGeo: g.glassGeo });
  },
};

/**
 * Shared low-tesselation merged geometries for instanced globe fleet.
 * One BufferGeometry per material slot per fleet key.
 */
export function getGlobeAircraftGeometries(key: GlobeFleetGeometryKey): GlobeFleetAircraft {
  if (cache[key]) return cache[key]!;
  const g = asFleet(build[key]());
  cache[key] = g;
  return g;
}
