/**
 * AircraftGlobeLayer
 *
 * Instanced merged aircraft models — one InstancedMesh per material slot per fleet bucket.
 * Buckets: ICAO-specific silhouettes (B777/B737/A320/ATR72/E190) + procedural generic fallback.
 * Per-aircraft scale from classify(type) × METERS_TO_GLOBE; generic fleet uses instance colors (military red).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { aircraftBasisQuaternion, latLngAltToXYZ } from "@/lib/globe-coords";
import { METERS_TO_GLOBE } from "@/lib/model-geometry-constants";
import {
  getGlobeAircraftGeometries,
  type GlobeFleetGeometryKey,
} from "@/lib/globe-aircraft-geometry-bank";
import type { Aircraft } from "@/lib/osint-services";
import { resolveAircraftVisual } from "@/lib/aircraft-classifier";

type AircraftLod = "hidden" | "silhouette" | "detail";

const FLEET_SURFACE: Record<GlobeFleetGeometryKey, { main: string; emissive: number }> = {
  b777: { main: "#e8f4ff", emissive: 0.2 },
  b737: { main: "#c8d8e8", emissive: 0.2 },
  a320: { main: "#c8d8e8", emissive: 0.2 },
  atr72: { main: "#9cb8a8", emissive: 0.15 },
  e190: { main: "#b0c8d8", emissive: 0.18 },
  generic: { main: "#ffffff", emissive: 0.06 },
};

const BUCKET_ORDER: GlobeFleetGeometryKey[] = ["b777", "b737", "a320", "atr72", "e190", "generic"];

interface AircraftGlobeLayerProps {
  data: Aircraft[];
  visible: boolean;
  selectedIcao?: string | null;
}

export default function AircraftGlobeLayer({ data, visible, selectedIcao }: AircraftGlobeLayerProps) {
  const { camera } = useThree();
  const [lod, setLod] = useState<AircraftLod>("silhouette");

  useFrame(() => {
    const dist = camera.position.length();
    setLod((prev) => {
      const next: AircraftLod = dist > 350 ? "hidden" : dist > 200 ? "silhouette" : "detail";
      return next !== prev ? next : prev;
    });
  });

  const buckets = useMemo(() => {
    const out: Record<GlobeFleetGeometryKey, Aircraft[]> = {
      b777: [],
      b737: [],
      a320: [],
      atr72: [],
      e190: [],
      generic: [],
    };
    for (const a of data) {
      const v = resolveAircraftVisual(a);
      const key = v.specificModel ?? "generic";
      out[key].push(a);
    }
    return out;
  }, [data]);

  if (!visible || data.length === 0 || lod === "hidden") return null;

  return (
    <>
      {BUCKET_ORDER.map((key) =>
        buckets[key].length > 0 ? (
          <InstancedAircraftFleet key={key} fleetKey={key} planes={buckets[key]} selectedIcao={selectedIcao} />
        ) : null,
      )}
    </>
  );
}

interface InstanceState {
  lat: number;
  lon: number;
  altKm: number;
  heading: number;
}

function InstancedAircraftFleet({
  fleetKey,
  planes,
  selectedIcao,
}: {
  fleetKey: GlobeFleetGeometryKey;
  planes: Aircraft[];
  selectedIcao?: string | null;
}) {
  const geos = useMemo(() => getGlobeAircraftGeometries(fleetKey), [fleetKey]);
  const surface = FLEET_SURFACE[fleetKey];
  const tintInstances = fleetKey === "generic";

  const matWhite = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: surface.main,
        emissive: surface.main,
        emissiveIntensity: surface.emissive,
        metalness: 0.2,
        roughness: 0.55,
      }),
    [surface],
  );
  const matGrey = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x333333,
        emissive: 0x111111,
        emissiveIntensity: 0.1,
        metalness: 0.35,
        roughness: 0.6,
      }),
    [],
  );
  const matGlass = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x0a0f18,
        emissive: 0x05060a,
        emissiveIntensity: 0.25,
        metalness: 0.75,
        roughness: 0.15,
      }),
    [],
  );
  const matProp = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x222222,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        roughness: 0.5,
        depthWrite: false,
      }),
    [],
  );

  const whiteRef = useRef<THREE.InstancedMesh>(null);
  const greyRef = useRef<THREE.InstancedMesh>(null);
  const glassRef = useRef<THREE.InstancedMesh>(null);
  const propRef = useRef<THREE.InstancedMesh | null>(null);
  const count = planes.length;
  const hasProp = fleetKey === "atr72" && geos.propGeo;

  const interpRef = useRef<Map<string, InstanceState>>(new Map());

  const planesRef = useRef(planes);
  planesRef.current = planes;
  const selectedIcaoRef = useRef(selectedIcao);
  selectedIcaoRef.current = selectedIcao;

  useEffect(() => {
    if (!tintInstances) return;
    const assignTint = (mesh: THREE.InstancedMesh | null) => {
      if (!mesh) return;
      mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3);
    };
    assignTint(whiteRef.current);
    assignTint(greyRef.current);
    assignTint(glassRef.current);
  }, [count, tintInstances]);

  useEffect(
    () => () => {
      matWhite.dispose();
      matGrey.dispose();
      matGlass.dispose();
      matProp.dispose();
    },
    [matWhite, matGrey, matGlass, matProp],
  );

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);

  useFrame((_, delta) => {
    const w = whiteRef.current;
    const g = greyRef.current;
    const gl = glassRef.current;
    const p = hasProp ? propRef.current : null;
    if (!w || !g || !gl) return;

    const currentPlanes = planesRef.current;
    const interp = interpRef.current;
    const lerpFactor = Math.min(delta * 3, 1);

    const currentIds = new Set(currentPlanes.map((f) => f.icao24));
    interp.forEach((_, key) => {
      if (!currentIds.has(key)) interp.delete(key);
    });

    for (let i = 0; i < currentPlanes.length; i++) {
      const flight = currentPlanes[i]!;
      const targetAltKm = (flight.altitude ?? 0) / 1000;
      const targetLat = flight.latitude;
      const targetLon = flight.longitude;
      const targetHeading = flight.heading ?? 0;

      let state = interp.get(flight.icao24);
      if (!state) {
        state = { lat: targetLat, lon: targetLon, altKm: targetAltKm, heading: targetHeading };
        interp.set(flight.icao24, state);
      } else {
        state.lat += (targetLat - state.lat) * lerpFactor;
        state.lon += (targetLon - state.lon) * lerpFactor;
        state.altKm += (targetAltKm - state.altKm) * lerpFactor;

        let dh = targetHeading - state.heading;
        if (dh > 180) dh -= 360;
        if (dh < -180) dh += 360;
        state.heading += dh * lerpFactor;
      }

      const pos = latLngAltToXYZ(state.lat, state.lon, state.altKm);
      const q = aircraftBasisQuaternion(state.lat, state.lon, state.heading);
      dummy.position.copy(pos);
      dummy.quaternion.copy(q);

      const vis = resolveAircraftVisual(flight);
      const baseScale = METERS_TO_GLOBE * vis.categoryScale;
      const isSelected = selectedIcaoRef.current === flight.icao24;
      dummy.scale.setScalar(isSelected ? baseScale * 1.4 : baseScale);

      dummy.updateMatrix();
      const m = dummy.matrix;
      w.setMatrixAt(i, m);
      g.setMatrixAt(i, m);
      gl.setMatrixAt(i, m);
      if (p) p.setMatrixAt(i, m);

      if (tintInstances && w.instanceColor && g.instanceColor && gl.instanceColor) {
        tempColor.set(vis.silhouetteColor);
        w.instanceColor.setXYZ(i, tempColor.r, tempColor.g, tempColor.b);
        g.instanceColor.setXYZ(i, tempColor.r, tempColor.g, tempColor.b);
        gl.instanceColor.setXYZ(i, tempColor.r * 0.6, tempColor.g * 0.6, tempColor.b * 0.6);
        if (p && p.instanceColor) {
          p.instanceColor.setXYZ(i, tempColor.r * 0.35, tempColor.g * 0.35, tempColor.b * 0.35);
        }
      }
    }

    w.instanceMatrix.needsUpdate = true;
    g.instanceMatrix.needsUpdate = true;
    gl.instanceMatrix.needsUpdate = true;
    if (tintInstances && w.instanceColor && g.instanceColor && gl.instanceColor) {
      w.instanceColor.needsUpdate = true;
      g.instanceColor.needsUpdate = true;
      gl.instanceColor.needsUpdate = true;
      if (p?.instanceColor) p.instanceColor.needsUpdate = true;
    }
    if (p) p.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={whiteRef} args={[geos.whiteGeo, matWhite, count]} frustumCulled={false} />
      <instancedMesh ref={greyRef} args={[geos.greyGeo, matGrey, count]} frustumCulled={false} />
      <instancedMesh ref={glassRef} args={[geos.glassGeo, matGlass, count]} frustumCulled={false} />
      {hasProp && geos.propGeo ? (
        <instancedMesh ref={propRef} args={[geos.propGeo, matProp, count]} frustumCulled={false} />
      ) : null}
    </group>
  );
}
