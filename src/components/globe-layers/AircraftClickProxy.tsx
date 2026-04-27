/**
 * AircraftClickProxy
 *
 * Renders invisible spheres at each aircraft position for R3F raycasting.
 * InstancedMesh doesn't support per-instance onClick, so we use individual
 * meshes with onClick handlers. Only renders for visible aircraft (within
 * the camera's LOD range).
 *
 * Performance: uses a single shared invisible material, positions updated
 * via useFrame (no React re-renders on position change).
 */

import { useRef, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { latLngAltToXYZ } from "@/lib/globe-coords";
import { useSelection } from "@/contexts/SelectionContext";
import type { Aircraft } from "@/lib/osint-services";

const PROXY_RADIUS = 0.4; // Globe units — ~25km sphere, easily clickable

const invisibleMat = new THREE.MeshBasicMaterial({
  colorWrite: false, // Invisible but still participates in raycasting
  depthWrite: false,
  side: THREE.DoubleSide,
});

const proxyGeo = new THREE.SphereGeometry(PROXY_RADIUS, 6, 4);

interface AircraftClickProxyProps {
  data: Aircraft[];
  visible: boolean;
}

export default function AircraftClickProxy({ data, visible }: AircraftClickProxyProps) {
  if (!visible || data.length === 0) return null;

  return (
    <group>
      {data.map((ac) => (
        <AircraftHitSphere key={ac.icao24} aircraft={ac} />
      ))}
    </group>
  );
}

function AircraftHitSphere({ aircraft }: { aircraft: Aircraft }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { setSelectedEntity } = useSelection();

  // Track interpolated position matching AircraftGlobeLayer
  const posRef = useRef({ lat: aircraft.latitude, lon: aircraft.longitude, altKm: (aircraft.altitude ?? 0) / 1000 });

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const lerpFactor = Math.min(delta * 3, 1);
    const p = posRef.current;
    p.lat += (aircraft.latitude - p.lat) * lerpFactor;
    p.lon += (aircraft.longitude - p.lon) * lerpFactor;
    p.altKm += ((aircraft.altitude ?? 0) / 1000 - p.altKm) * lerpFactor;
    const pos = latLngAltToXYZ(p.lat, p.lon, p.altKm);
    meshRef.current.position.copy(pos);
  });

  const handleClick = useCallback(
    (e: THREE.Event) => {
      (e as any).stopPropagation?.();
      setSelectedEntity({
        type: "aircraft",
        id: aircraft.icao24,
        lat: aircraft.latitude,
        lon: aircraft.longitude,
        data: aircraft as unknown as Record<string, unknown>,
        selectedAt: new Date(),
      });
    },
    [aircraft, setSelectedEntity],
  );

  const handlePointerOver = useCallback(() => {
    document.body.style.cursor = "crosshair";
  }, []);

  const handlePointerOut = useCallback(() => {
    document.body.style.cursor = "default";
  }, []);

  return (
    <mesh
      ref={meshRef}
      geometry={proxyGeo}
      material={invisibleMat}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    />
  );
}
