/**
 * AircraftGlobeLayer
 *
 * Renders aircraft as oriented 3D shapes on the globe surface.
 * One InstancedMesh per aircraft type for performance.
 * Orientation follows heading from OpenSky data.
 */

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { latLngAltToXYZ, headingQuaternion } from "@/lib/globe-coords";
import type { Aircraft } from "@/lib/osint-services";

const AIRCRAFT_SCALE = 0.5;

type AircraftType = "widebody" | "narrowbody" | "regional" | "turboprop";

function classifyAircraft(callsign: string, altFt: number): AircraftType {
  const cs = callsign?.toUpperCase() ?? "";
  if (altFt > 35000 || /^(UAL|DAL|AWE|UAE|QTR|SIA|BAW|CPA)/.test(cs)) return "widebody";
  if (/^(TAM|GOL|AZU|VRG|GLO|JJP)/.test(cs)) return "regional";
  if (/^(EXS|WZZ|VKG|SAS)/.test(cs)) return "turboprop";
  return "narrowbody";
}

interface AircraftGlobeLayerProps {
  data: Aircraft[];
  visible: boolean;
}

export default function AircraftGlobeLayer({ data, visible }: AircraftGlobeLayerProps) {
  if (!visible || data.length === 0) return null;

  const groups: Record<AircraftType, Aircraft[]> = {
    widebody: [],
    narrowbody: [],
    regional: [],
    turboprop: [],
  };

  for (const a of data) {
    const altFt = a.altitude * 3.28084;
    groups[classifyAircraft(a.callsign, altFt)].push(a);
  }

  return (
    <>
      {(Object.entries(groups) as [AircraftType, Aircraft[]][]).map(([type, planes]) => (
        <AircraftTypeInstances key={type} type={type} planes={planes} />
      ))}
    </>
  );
}

interface AircraftTypeInstancesProps {
  type: AircraftType;
  planes: Aircraft[];
}

const SCALE_BY_TYPE: Record<AircraftType, number> = {
  widebody: AIRCRAFT_SCALE * 1.4,
  narrowbody: AIRCRAFT_SCALE * 1.0,
  regional: AIRCRAFT_SCALE * 0.8,
  turboprop: AIRCRAFT_SCALE * 0.7,
};

const COLOR_BY_TYPE: Record<AircraftType, string> = {
  widebody: "#00ff9c",
  narrowbody: "#00dd88",
  regional: "#00bb77",
  turboprop: "#009966",
};

function AircraftTypeInstances({ type, planes }: AircraftTypeInstancesProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const scale = SCALE_BY_TYPE[type];
  const color = COLOR_BY_TYPE[type];

  const geometry = useMemo(() => new THREE.ConeGeometry(0.3, 1.8, 5), []);
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.4,
        metalness: 0.3,
        roughness: 0.6,
      }),
    [color],
  );

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useEffect(() => {
    if (!meshRef.current || planes.length === 0) return;
    const dummy = new THREE.Object3D();
    planes.forEach((p, i) => {
      const altKm = (p.altitude ?? 0) / 1000;
      const pos = latLngAltToXYZ(p.latitude, p.longitude, altKm);
      const q = headingQuaternion(p.latitude, p.longitude, p.heading ?? 0);
      dummy.position.copy(pos);
      dummy.quaternion.copy(q);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [planes, scale]);

  if (planes.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, planes.length]}
      frustumCulled={false}
    />
  );
}
