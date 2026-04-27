/**
 * SatelliteGlobeLayer
 *
 * LEO: instanced merged CubeSat body + panel (2 draws per LEO group).
 * GEO: single instanced box (many GEO assets share one simple solid).
 * Special (ISS, Tiangong): one group each with custom meshes.
 * LOD: far camera hides 3D mesh (globe.gl dots only).
 */

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { latLngAltToXYZ } from "@/lib/globe-coords";
import { getLeoCubeSatGeometriesForGlobe, LEO_GEO_ALT_SPLIT_KM } from "@/lib/globe-satellite-geometry-bank";
import type { Satellite } from "@/lib/osint-services";

interface SatelliteGlobeLayerProps {
  data: Satellite[];
  visible: boolean;
}

const ISS_NORAD = "25544";
const TIANGONG_NORADS = ["48274", "49260", "49848"];

const LEO_SCALE = 0.85;
const GEO_SCALE = 0.28;
const GEO_BOX = [2.2, 0.75, 2.2] as const;

function isSpecialSatellite(s: Satellite): boolean {
  const id = s.noradId.trim();
  if (id === ISS_NORAD) return true;
  if (TIANGONG_NORADS.includes(id)) return true;
  return /TIANGONG|CSS|TIANHE|WENTIAN|MENGTIAN/i.test(s.name);
}

export default function SatelliteGlobeLayer({ data, visible }: SatelliteGlobeLayerProps) {
  const { camera } = useThree();
  const [lod, setLod] = useState<"hidden" | "near">("near");

  useFrame(() => {
    const dist = camera.position.length();
    setLod((prev) => {
      const next = dist > 300 ? "hidden" : "near";
      return next !== prev ? next : prev;
    });
  });

  const { special, leo, geo } = useMemo(() => {
    const sp = data.filter(isSpecialSatellite);
    const rest = data.filter((s) => !isSpecialSatellite(s));
    return {
      special: sp,
      leo: rest.filter((s) => s.altitude < LEO_GEO_ALT_SPLIT_KM),
      geo: rest.filter((s) => s.altitude >= LEO_GEO_ALT_SPLIT_KM),
    };
  }, [data]);

  if (!visible || data.length === 0 || lod === "hidden") return null;

  return (
    <>
      {leo.length > 0 ? <LeoInstancedFleet data={leo} /> : null}
      {geo.length > 0 ? <GeoInstancedFleet data={geo} /> : null}
      {special.map((s) => (
        <SpecialSatellite key={s.noradId} sat={s} />
      ))}
    </>
  );
}

const radialUp = new THREE.Vector3(0, 1, 0);

function LeoInstancedFleet({ data }: { data: Satellite[] }) {
  const geos = useMemo(() => getLeoCubeSatGeometriesForGlobe(), []);
  const matBody = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#4a4a5a",
        emissive: "#0a0a0c",
        emissiveIntensity: 0.1,
        metalness: 0.85,
        roughness: 0.2,
      }),
    [],
  );
  const matPanel = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#1a237e",
        emissive: "#0a0f1a",
        emissiveIntensity: 0.15,
        metalness: 0.7,
        roughness: 0.35,
      }),
    [],
  );
  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const panelRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const n = data.length;

  useLayoutEffect(
    () => () => {
      matBody.dispose();
      matPanel.dispose();
    },
    [matBody, matPanel],
  );

  useLayoutEffect(() => {
    const w = bodyRef.current;
    const p = panelRef.current;
    if (!w || !p) return;
    for (let i = 0; i < n; i++) {
      const s = data[i]!;
      const pos = latLngAltToXYZ(s.latitude, s.longitude, s.altitude);
      const up = pos.clone().normalize();
      dummy.position.copy(pos);
      dummy.quaternion.setFromUnitVectors(radialUp, up);
      dummy.scale.setScalar(LEO_SCALE);
      dummy.updateMatrix();
      const m = dummy.matrix;
      w.setMatrixAt(i, m);
      p.setMatrixAt(i, m);
    }
    w.instanceMatrix.needsUpdate = true;
    p.instanceMatrix.needsUpdate = true;
  }, [data, dummy, n]);

  if (n === 0) return null;

  return (
    <group>
      <instancedMesh
        ref={bodyRef}
        args={[geos.body, matBody, n]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={panelRef}
        args={[geos.panel, matPanel, n]}
        frustumCulled={false}
      />
    </group>
  );
}

function GeoInstancedFleet({ data }: { data: Satellite[] }) {
  const geometry = useMemo(
    () => new THREE.BoxGeometry(GEO_BOX[0], GEO_BOX[1], GEO_BOX[2]),
    [],
  );
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#b8860b",
        emissive: "#2a1a0a",
        emissiveIntensity: 0.12,
        metalness: 0.5,
        roughness: 0.45,
      }),
    [],
  );
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const n = data.length;

  useLayoutEffect(() => () => geometry.dispose(), [geometry]);
  useLayoutEffect(
    () => () => {
      mat.dispose();
    },
    [mat],
  );

  useLayoutEffect(() => {
    const w = meshRef.current;
    if (!w) return;
    for (let i = 0; i < n; i++) {
      const s = data[i]!;
      const pos = latLngAltToXYZ(s.latitude, s.longitude, s.altitude);
      const up = pos.clone().normalize();
      dummy.position.copy(pos);
      dummy.quaternion.setFromUnitVectors(radialUp, up);
      dummy.scale.setScalar(GEO_SCALE);
      dummy.updateMatrix();
      w.setMatrixAt(i, dummy.matrix);
    }
    w.instanceMatrix.needsUpdate = true;
  }, [data, dummy, n]);

  if (n === 0) return null;
  return (
    <instancedMesh ref={meshRef} args={[geometry, mat, n]} frustumCulled={false} />
  );
}

function SpecialSatellite({ sat }: { sat: Satellite }) {
  const pos = latLngAltToXYZ(sat.latitude, sat.longitude, sat.altitude);
  const isISS = sat.noradId.trim() === ISS_NORAD;
  const color = isISS ? "#c8860a" : "#0d1b6e";
  const size = isISS ? 1.2 : 1.0;
  const up = pos.clone().normalize();
  const quat = new THREE.Quaternion().setFromUnitVectors(radialUp, up);

  return (
    <group position={pos} quaternion={quat}>
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
