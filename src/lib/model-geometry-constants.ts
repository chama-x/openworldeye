import * as THREE from "three";

/**
 * Tesselation for procedural aircraft/satellite models.
 * Gallery = interactive / preview; globe = instanced fleet (thousands of verts less).
 */
export type ModelTesselation = {
  radial: number;
  sphere: number;
  sphereH: number;
};

/** Shown in React model viewers — smooth silhouettes. */
const A320_B737_E190_TURN: ModelTesselation = { radial: 32, sphere: 32, sphereH: 16 };
const B777_TURN: ModelTesselation = { radial: 48, sphere: 48, sphereH: 24 };
const ATR_TURN: ModelTesselation = { radial: 32, sphere: 32, sphereH: 16 };

const GLOBE: ModelTesselation = { radial: 8, sphere: 10, sphereH: 8 };

export function a320Tess(q: "gallery" | "globe"): ModelTesselation {
  return q === "globe" ? GLOBE : A320_B737_E190_TURN;
}

export function b737Tess(q: "gallery" | "globe"): ModelTesselation {
  return q === "globe" ? GLOBE : A320_B737_E190_TURN;
}

export function b777Tess(q: "gallery" | "globe"): ModelTesselation {
  return q === "globe" ? GLOBE : B777_TURN;
}

export function e190Tess(q: "gallery" | "globe"): ModelTesselation {
  return q === "globe" ? GLOBE : A320_B737_E190_TURN;
}

export function atrTess(q: "gallery" | "globe"): ModelTesselation {
  return q === "globe" ? GLOBE : ATR_TURN;
}

export type GlobeFleetAircraft = {
  whiteGeo: THREE.BufferGeometry;
  greyGeo: THREE.BufferGeometry;
  glassGeo: THREE.BufferGeometry;
  /** ATR / turboprop prop discs (transparent) */
  propGeo?: THREE.BufferGeometry;
};

/** Scale meters (model space) to react-globe.gl world units (radius 100). */
export const METERS_TO_GLOBE = 0.02;
