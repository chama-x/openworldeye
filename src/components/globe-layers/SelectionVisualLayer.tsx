import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import { useSelection } from "@/contexts/SelectionContext";
import { useOsintSnapshot } from "@/contexts/OsintDataContext";
import { latLngAltToXYZ } from "@/lib/globe-coords";
import { conflictEventTypeColor } from "@/lib/threat-colors";
import type { Aircraft, MaritimeData, ConflictEvent, Earthquake, GpsJamPoint } from "@/lib/osint-services";

const UP = new THREE.Vector3(0, 1, 0);

const getAltColor = (altFt: number): THREE.Color => {
  const col = new THREE.Color();
  if (altFt > 30000) col.setHSL(0.6, 0.9, 0.5);       // cruise — blue
  else if (altFt > 10000) col.setHSL(0.5, 0.85, 0.45); // climb — cyan
  else if (altFt > 3000) col.setHSL(0.12, 0.9, 0.5);   // approach — amber
  else col.setHSL(0.05, 1.0, 0.5);                      // low — orange-red
  return col;
};

export default function SelectionVisualLayer() {
  const { selectedEntity } = useSelection();
  const osint = useOsintSnapshot();

  if (!selectedEntity) return null;

  switch (selectedEntity.type) {
    case "aircraft": {
      const ac = osint.aircraft.data.find(a => a.icao24 === selectedEntity.id) || (selectedEntity.data as unknown as Aircraft);
      return <AircraftSelection ac={ac} />;
    }
    case "vessel": {
      const vessel = osint.maritime.data.find(v => v.mmsi === selectedEntity.id) || (selectedEntity.data as unknown as MaritimeData);
      return <VesselSelection vessel={vessel} />;
    }
    case "conflict": {
      const conflict = osint.conflicts.data.find(c => c.id === selectedEntity.id) || (selectedEntity.data as unknown as ConflictEvent);
      return <ConflictSelection conflict={conflict} />;
    }
    case "gpsjam": {
      const jam = osint.gpsJam.data.find(j => `${j.lat}-${j.lon}` === selectedEntity.id) || (selectedEntity.data as unknown as GpsJamPoint);
      return <GpsJamSelection jam={jam} />;
    }
    case "earthquake": {
      const eq = osint.earthquakes.data.find(e => e.id === selectedEntity.id) || (selectedEntity.data as unknown as Earthquake);
      return <EarthquakeSelection eq={eq} />;
    }
    default:
      return null;
  }
}

/* ====== AIRCRAFT ====== */

function AircraftSelection({ ac }: { ac: Aircraft }) {
  const altKm = (ac.altitude ?? 0) / 1000;
  const surfPos = latLngAltToXYZ(ac.latitude, ac.longitude, 0.001);
  const up = surfPos.clone().normalize();
  const quat = new THREE.Quaternion().setFromUnitVectors(UP, up);

  // Trail from positionHistory with altitude-based vertex colors and fade
  const trailGeo = useMemo(() => {
    const history = ac.positionHistory;
    if (!history || history.length < 2) return null;
    
    const positions: number[] = [];
    const colors: number[] = [];
    const col = new THREE.Color();

    history.forEach((p, i) => {
      const pos = latLngAltToXYZ(p.lat, p.lon, p.alt / 1000);
      positions.push(pos.x, pos.y, pos.z);
      
      const t = i / (history.length - 1); // 0=oldest → 1=newest
      const altColor = getAltColor(p.alt * 3.28084); // meters to feet
      
      // LineBasicMaterial does not support per-vertex alpha, so we simulate a fade
      // by lerping the vertex color toward black (which blends well on a dark globe)
      col.copy(altColor).lerp(new THREE.Color(0,0,0), 1 - Math.pow(t, 0.5));
      colors.push(col.r, col.g, col.b);
    });

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    return geo;
  }, [ac.positionHistory]);

  // Future path projection: 10min at current speed/heading
  const futurePath = useMemo(() => {
    if (!ac.velocity || !ac.heading) return null;
    const speedKts = ac.velocity / 0.514444; // m/s to knots
    const distNm = speedKts * (10 / 60); // 10 minutes
    const distDeg = distNm / 60;
    const trackRad = (ac.heading * Math.PI) / 180;
    const futureLat = ac.latitude + distDeg * Math.cos(trackRad);
    const futureLon = ac.longitude + distDeg * Math.sin(trackRad);
    const start = latLngAltToXYZ(ac.latitude, ac.longitude, altKm);
    const end = latLngAltToXYZ(futureLat, futureLon, altKm);
    return [start, end];
  }, [ac.latitude, ac.longitude, ac.velocity, ac.heading, altKm]);

  const futureLineRef = useRef<any>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (futureLineRef.current?.material) {
      futureLineRef.current.material.dashOffset = -(clock.getElapsedTime() * 0.12);
    }
    
    if (ringRef.current) {
      const t = (clock.getElapsedTime() % 2.0) / 2.0; // 0→1 over 2 seconds
      const s = 1.0 + t * 0.35;
      ringRef.current.scale.setScalar(s);
      (ringRef.current.material as THREE.MeshBasicMaterial).opacity = 0.6 * (1 - t);
    }
  });

  return (
    <group>
      {/* Trail behind aircraft */}
      {trailGeo && (
        <primitive object={new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false }))} />
      )}

      {/* Future path projection (dashed) */}
      {futurePath && (
        <Line
          ref={futureLineRef}
          points={futurePath}
          color="#00FFFF"
          lineWidth={1.5}
          transparent
          opacity={0.35}
          dashed
          dashSize={0.3}
          gapSize={0.2}
        />
      )}

      {/* Ground ring */}
      <mesh ref={ringRef} position={surfPos} quaternion={quat}>
        <ringGeometry args={[0.3, 0.35, 32]} />
        <meshBasicMaterial color="#00FF9C" transparent opacity={0.6} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

/* ====== VESSEL ====== */

function VesselSelection({ vessel }: { vessel: MaritimeData }) {
  const currentPos = latLngAltToXYZ(vessel.lat, vessel.lon, 0.001);
  const up = currentPos.clone().normalize();
  const quat = new THREE.Quaternion().setFromUnitVectors(UP, up);

  const coneRef = useRef<THREE.Mesh>(null);
  const isDark = (vessel.darkMinutes ?? 0) > 0;

  useFrame(({ clock }) => {
    if (coneRef.current && isDark) {
      const t = clock.getElapsedTime();
      const s = 1.0 + Math.sin(t * Math.PI) * 0.075;
      coneRef.current.scale.set(s, 1, s);
    }
  });

  return (
    <group>
      {isDark && (
        <group position={currentPos} quaternion={quat}>
          <mesh ref={coneRef} rotation={[-Math.PI / 2, 0, (-vessel.cog * Math.PI) / 180]}>
            <coneGeometry args={[Math.min(2.0, (vessel.darkMinutes ?? 0) * 0.05), 3, 16, 1, true, 0, Math.PI]} />
            <meshBasicMaterial color="#F59E0B" transparent opacity={0.3} side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}
    </group>
  );
}

/* ====== CONFLICT ====== */

function ConflictSelection({ conflict }: { conflict: ConflictEvent }) {
  const pos = latLngAltToXYZ(conflict.lat, conflict.lon, 0.005);
  const up = pos.clone().normalize();
  const quat = new THREE.Quaternion().setFromUnitVectors(UP, up);

  const ringRadius = 300 / 6371 * 100; // ~300km context ring
  const color = conflictEventTypeColor(conflict.eventType);
  const thick = conflict.fatalities >= 100 ? 4 : conflict.fatalities > 0 ? 2 : 1;

  const points = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const segments = 64;
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(theta) * ringRadius, 0, Math.sin(theta) * ringRadius));
    }
    return pts;
  }, [ringRadius]);

  return (
    <group position={pos} quaternion={quat}>
      <Line
        points={points}
        color={color}
        lineWidth={thick}
        transparent
        opacity={0.7}
        dashed
        dashSize={1}
        gapSize={0.5}
      />
    </group>
  );
}

/* ====== GPS JAM ====== */

function GpsJamSelection({ jam }: { jam: GpsJamPoint }) {
  const pos = latLngAltToXYZ(jam.lat, jam.lon, 0.005);
  const up = pos.clone().normalize();
  const quat = new THREE.Quaternion().setFromUnitVectors(UP, up);

  const color = jam.level === 3 ? "#FF3333" : jam.level === 2 ? "#FF6B00" : "#FFB800";

  const r1 = useRef<THREE.Mesh>(null);
  const r2 = useRef<THREE.Mesh>(null);
  const r3 = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() % 2.1;

    if (r1.current) {
      const t1 = (t + 0.0) % 2.1;
      const progress = Math.min(t1 / 1.5, 1.0);
      const s = 1.0 + progress * 0.5;
      r1.current.scale.setScalar(s);
      (r1.current.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1.0 - progress);
    }
    if (r2.current) {
      const t2 = (t + 1.4) % 2.1;
      const progress = Math.min(t2 / 1.5, 1.0);
      const s = 1.0 + progress * 0.5;
      r2.current.scale.setScalar(s);
      (r2.current.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1.0 - progress);
    }
    if (r3.current) {
      const t3 = (t + 0.7) % 2.1;
      const progress = Math.min(t3 / 1.5, 1.0);
      const s = 1.0 + progress * 0.5;
      r3.current.scale.setScalar(s);
      (r3.current.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1.0 - progress);
    }
  });

  return (
    <group position={pos} quaternion={quat}>
      <mesh ref={r1}>
        <ringGeometry args={[0.9, 1.0, 32]} />
        <meshBasicMaterial color={color} transparent depthWrite={false} />
      </mesh>
      <mesh ref={r2}>
        <ringGeometry args={[0.9, 1.0, 32]} />
        <meshBasicMaterial color={color} transparent depthWrite={false} />
      </mesh>
      <mesh ref={r3}>
        <ringGeometry args={[0.9, 1.0, 32]} />
        <meshBasicMaterial color={color} transparent depthWrite={false} />
      </mesh>
    </group>
  );
}

/* ====== EARTHQUAKE ====== */

function EarthquakeSelection({ eq }: { eq: Earthquake }) {
  const pos = latLngAltToXYZ(eq.latitude, eq.longitude, 0.005);
  const up = pos.clone().normalize();
  const quat = new THREE.Quaternion().setFromUnitVectors(UP, up);

  const meshRef = useRef<THREE.Mesh>(null);
  const [startTime] = useState(() => performance.now() / 1000);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime() - startTime;
    if (t < 2.0) {
      const progress = t / 2.0;
      const maxScale = 1.0 + (eq.magnitude * 0.2);
      const s = 1.0 + progress * (maxScale - 1.0);
      meshRef.current.scale.setScalar(s);
      (meshRef.current.material as THREE.MeshBasicMaterial).opacity = 0.7 * (1.0 - Math.pow(progress, 2));
    } else {
      (meshRef.current.material as THREE.MeshBasicMaterial).opacity = 0;
    }
  });

  return (
    <group position={pos} quaternion={quat}>
      <mesh ref={meshRef}>
        <ringGeometry args={[0.8, 1.0, 32]} />
        <meshBasicMaterial color="#FFB800" transparent depthWrite={false} />
      </mesh>
    </group>
  );
}
