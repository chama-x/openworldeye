import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import { useOsintSnapshot } from "@/contexts/OsintDataContext";
import { latLngAltToXYZ } from "@/lib/globe-coords";

export default function CorrelationArcLayer() {
  const { correlations } = useOsintSnapshot();

  const arcs = useMemo(() => {
    const lines = [];
    for (const corr of correlations) {
      if (corr.score < 50 || !corr.primaryEntity) continue;
      
      const p1 = latLngAltToXYZ(corr.primaryEntity.lat, corr.primaryEntity.lon, 0.01);
      const color = corr.score >= 75 ? "#FF9500" : "#7DD3FC"; // amber (75+), blue (50-74)

      // Only draw top 5 relations per correlation to avoid clutter
      const relations = corr.relatedEntities.slice(0, 5);
      
      for (const rel of relations) {
        const p2 = latLngAltToXYZ(rel.lat, rel.lon, 0.01);
        
        // Midpoint with altitude bump
        const midLat = (corr.primaryEntity.lat + rel.lat) / 2;
        const midLon = (corr.primaryEntity.lon + rel.lon) / 2;
        // bump depends on distance
        const dist = p1.distanceTo(p2);
        const pMid = latLngAltToXYZ(midLat, midLon, dist * 0.15); // ~15% altitude bump
        
        const curve = new THREE.CatmullRomCurve3([p1, pMid, p2]);
        const points = curve.getPoints(32);
        
        lines.push({ points, color });
      }
    }
    return lines;
  }, [correlations]);

  const dashRef = useRef<{ material: THREE.LineDashedMaterial }[]>([]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    dashRef.current.forEach(line => {
      if (line && line.material) {
        (line.material as any).dashOffset = -t * 2; // traveling pulse
      }
    });
  });

  return (
    <group>
      {arcs.map((arc, i) => (
        <Line 
          key={i}
          points={arc.points}
          color={arc.color}
          transparent
          opacity={0.35}
          lineWidth={2}
          dashed
          dashSize={0.5}
          gapSize={1.5}
          ref={(line: any) => {
            if (line) dashRef.current[i] = line;
          }}
        />
      ))}
    </group>
  );
}
