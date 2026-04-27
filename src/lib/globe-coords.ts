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
 * Compute a quaternion that orients a model's +Z axis along
 * the heading direction on the globe surface at lat/lng.
 * heading: degrees clockwise from north (OpenSky heading)
 */
export function headingQuaternion(lat: number, lng: number, heading: number): THREE.Quaternion {
  const pos = latLngAltToXYZ(lat, lng, 0);
  const normal = pos.clone().normalize();
  const north = new THREE.Vector3(0, 1, 0);
  north
    .sub(normal.clone().multiplyScalar(normal.dot(new THREE.Vector3(0, 1, 0))))
    .normalize();
  const q = new THREE.Quaternion().setFromAxisAngle(normal, (-heading * Math.PI) / 180);
  const forward = north.clone().applyQuaternion(q);
  const m = new THREE.Matrix4().lookAt(new THREE.Vector3(0, 0, 0), forward, normal);
  return new THREE.Quaternion().setFromRotationMatrix(m);
}
