/**
 * SatelliteGlobeLayer
 *
 * Renders satellites as 3D oriented shapes on the globe.
 * ISS and Tiangong CSS get special larger markers.
 * All others rendered as instanced small cross-shapes.
 */

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { latLngAltToXYZ } from "@/lib/globe-coords";
import type { Satellite } from "@/lib/osint-services";

interface SatelliteGlobeLayerProps {
  data: Satellite[];
  visible: boolean;
}

const ISS_NORAD = "25544";
/** CelesTrak Chinese Space Station catalog IDs (Tianhe, Wentian, Mengtian) */
const TIANGONG_NORADS = ["48274", "49260", "49848"];

function isSpecialSatellite(s: Satellite): boolean {
  const id = s.noradId.trim();
  if (id === ISS_NORAD) return true;
  if (TIANGONG_NORADS.includes(id)) return true;
  return /TIANGONG|CSS|TIANHE|WENTIAN|MENGTIAN/i.test(s.name);
}

export default function SatelliteGlobeLayer({ data, visible }: SatelliteGlobeLayerProps) {
  if (!visible || data.length === 0) return null;

  const special = data.filter(isSpecialSatellite);
  const regular = data.filter((s) => !isSpecialSatellite(s));

  return (
    <>
      <RegularSatellites data={regular} />
      {special.map((s) => (
        <SpecialSatellite key={s.noradId} sat={s} />
      ))}
    </>
  );
}

function RegularSatellites({ data }: { data: Satellite[] }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => new THREE.BoxGeometry(1, 0.15, 0.15), []);
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#4fc3f7",
        emissive: "#4fc3f7",
        emissiveIntensity: 0.5,
        metalness: 0.8,
        roughness: 0.2,
      }),
    [],
  );

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useEffect(() => {
    if (!meshRef.current || data.length === 0) return;
    const dummy = new THREE.Object3D();
    data.forEach((s, i) => {
      const pos = latLngAltToXYZ(s.latitude, s.longitude, s.altitude);
      dummy.position.copy(pos);
      dummy.scale.setScalar(0.3);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [data]);

  if (data.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, data.length]}
      frustumCulled={false}
    />
  );
}

function SpecialSatellite({ sat }: { sat: Satellite }) {
  const pos = latLngAltToXYZ(sat.latitude, sat.longitude, sat.altitude);
  const isISS = sat.noradId.trim() === ISS_NORAD;
  const color = isISS ? "#c8860a" : "#0d1b6e";
  const size = isISS ? 1.2 : 1.0;

  return (
    <group position={pos}>
      <mesh>
        <boxGeometry args={[size * 3, size * 0.2, size * 0.2]} />
        <meshStandardMaterial color="#aab0be" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[-size * 1.2, size * 0.4, 0]}>
        <boxGeometry args={[size * 0.8, size * 1.4, 0.05]} />
        <meshStandardMaterial
          color={color}
          metalness={0.3}
          roughness={0.6}
          emissive={color}
          emissiveIntensity={0.15}
        />
      </mesh>
      <mesh position={[size * 1.2, size * 0.4, 0]}>
        <boxGeometry args={[size * 0.8, size * 1.4, 0.05]} />
        <meshStandardMaterial
          color={color}
          metalness={0.3}
          roughness={0.6}
          emissive={color}
          emissiveIntensity={0.15}
        />
      </mesh>
      <pointLight color={isISS ? "#ffcc66" : "#4466ff"} intensity={2} distance={8} />
    </group>
  );
}
