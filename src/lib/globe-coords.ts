import * as THREE from "three";

// react-globe.gl default globe radius = 100 units
const GLOBE_RADIUS = 100;

/**
 * Convert geographic coordinates + altitude to Three.js world XYZ.
 * altKm: altitude in kilometres above Earth surface (0 = on surface)
 */
export function latLngAltToXYZ(lat: number, lng: number, altKm: number): THREE.Vector3 {
  const R = GLOBE_RADIUS + (altKm / 6371) * GLOBE_RADIUS;
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -R * Math.sin(phi) * Math.cos(theta),
    R * Math.cos(phi),
    R * Math.sin(phi) * Math.sin(theta),
  );
}

/**
 * Quaternion that maps model space (+Y up from wings, +Z nose) onto the globe:
 * local Y → surface normal (radial outward), local Z → ground track (heading).
 * headingDeg: clockwise from north (ADS-B track / true heading).
 */
export function aircraftBasisQuaternion(lat: number, lng: number, headingDeg: number): THREE.Quaternion {
  const pos = latLngAltToXYZ(lat, lng, 0);
  const normal = pos.clone().normalize();
  const worldUp = new THREE.Vector3(0, 1, 0);
  let north = worldUp.clone().sub(normal.clone().multiplyScalar(worldUp.dot(normal)));
  if (north.lengthSq() < 1e-8) {
    north = new THREE.Vector3(0, 0, 1).sub(normal.clone().multiplyScalar(normal.z));
  }
  north.normalize();
  const qHeading = new THREE.Quaternion().setFromAxisAngle(normal, (-headingDeg * Math.PI) / 180);
  const forward = north.clone().applyQuaternion(qHeading).normalize();

  const yAxis = normal.clone();
  const zAxis = forward.clone();
  const xAxis = new THREE.Vector3().crossVectors(yAxis, zAxis).normalize();
  zAxis.crossVectors(xAxis, yAxis).normalize();

  const mat = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis);
  return new THREE.Quaternion().setFromRotationMatrix(mat);
}

/** @deprecated Prefer aircraftBasisQuaternion — same implementation */
export function headingQuaternion(lat: number, lng: number, heading: number): THREE.Quaternion {
  return aircraftBasisQuaternion(lat, lng, heading);
}
