import * as THREE from "three";
import { createCubeSatGeometries } from "@/components/models/LeoCubeSatModel";

export type LeoGlobeGeos = { body: THREE.BufferGeometry; panel: THREE.BufferGeometry };

let leo: LeoGlobeGeos | null = null;

export function getLeoCubeSatGeometriesForGlobe(): LeoGlobeGeos {
  if (leo) return leo;
  const g = createCubeSatGeometries("globe");
  if (!g.bodyGeo || !g.panelGeo) throw new Error("Leo globe geometry");
  leo = { body: g.bodyGeo, panel: g.panelGeo };
  return leo;
}

/** km — above this we treat as GEO and use a lighter instanced bus shape. */
export const LEO_GEO_ALT_SPLIT_KM = 24_000;
