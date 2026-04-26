/**
 * CommandGlobe.tsx
 *
 * The central 3D globe canvas — the visual heart of OpenWorldEye.
 * Uses react-globe.gl (Three.js under the hood) to render:
 *   - Photorealistic-style night earth
 *   - Aircraft flight points
 *   - Satellite orbital positions
 *   - Earthquake epicenters
 *   - Conflict event markers (with pulse rings)
 *
 * The globe consumes the GlobalClock so satellite positions
 * reflect the currently scrubbed time.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Globe, { type GlobeMethods } from "react-globe.gl";
import { useOsintSnapshot } from "@/contexts/OsintDataContext";
import { useDataLayers } from "@/contexts/DataLayersContext";

export interface MarkerLike {
  lat: number;
  lng: number;
  altitude: number;
  size: number;
  color: string;
  label: string;
  category: string;
  raw: unknown;
}

export interface CommandGlobeProps {
  onSelectMarker?: (m: MarkerLike | null) => void;
}

export default function CommandGlobe({ onSelectMarker }: CommandGlobeProps) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });

  const { aircraft, satellites, earthquakes, conflicts } = useOsintSnapshot();
  const { layer } = useDataLayers();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setSize({ width: r.width, height: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!globeRef.current) return;
    const ctrl = globeRef.current.controls() as {
      autoRotate: boolean;
      autoRotateSpeed: number;
      enableDamping: boolean;
      dampingFactor: number;
      minDistance: number;
      maxDistance: number;
    };
    ctrl.autoRotate = true;
    ctrl.autoRotateSpeed = 0.35;
    ctrl.enableDamping = true;
    ctrl.dampingFactor = 0.08;
    ctrl.minDistance = 150;
    ctrl.maxDistance = 600;
    globeRef.current.pointOfView({ lat: 25, lng: 20, altitude: 2.5 }, 1500);
  }, []);

  const aircraftPoints = useMemo<MarkerLike[]>(
    () =>
      aircraft.data.map((a) => ({
        lat: a.latitude,
        lng: a.longitude,
        altitude: Math.max(0.005, a.altitude / 100000),
        size: 0.18,
        color: layer("aircraft").color,
        label: `${a.callsign} • ${a.origin_country}`,
        category: "AIRCRAFT",
        raw: a,
      })),
    [aircraft.data, layer],
  );

  const satellitePoints = useMemo<MarkerLike[]>(
    () =>
      satellites.data.map((s) => ({
        lat: s.latitude,
        lng: s.longitude,
        altitude: Math.min(2.5, s.altitude / 6371),
        size: 0.25,
        color: layer("satellites").color,
        label: `${s.name} • NORAD ${s.noradId}`,
        category: "SATELLITE",
        raw: s,
      })),
    [satellites.data, layer],
  );

  const earthquakePoints = useMemo<MarkerLike[]>(
    () =>
      earthquakes.data.map((e) => ({
        lat: e.latitude,
        lng: e.longitude,
        altitude: 0.01,
        size: 0.15 + e.magnitude * 0.08,
        color: layer("earthquakes").color,
        label: `M${e.magnitude} • ${e.place}`,
        category: "EARTHQUAKE",
        raw: e,
      })),
    [earthquakes.data, layer],
  );

  const conflictPoints = useMemo<MarkerLike[]>(
    () =>
      conflicts.data.map((c) => ({
        lat: c.latitude,
        lng: c.longitude,
        altitude: 0.012,
        size: c.severity === "high" ? 0.5 : c.severity === "medium" ? 0.35 : 0.25,
        color: layer("conflicts").color,
        label: `${c.type} • ${c.description}`,
        category: "CONFLICT",
        raw: c,
      })),
    [conflicts.data, layer],
  );

  const allPoints = useMemo(
    () => [...aircraftPoints, ...satellitePoints, ...earthquakePoints, ...conflictPoints],
    [aircraftPoints, satellitePoints, earthquakePoints, conflictPoints],
  );

  const ringsData = useMemo(
    () =>
      conflictPoints.map((c) => ({
        lat: c.lat,
        lng: c.lng,
        maxR: c.size * 8,
        propagationSpeed: 2,
        repeatPeriod: 1800,
        color: c.color,
      })),
    [conflictPoints],
  );

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden">
      <Globe
        ref={globeRef}
        width={size.width}
        height={size.height}
        backgroundColor="rgba(0,0,0,0)"
        globeImageUrl="https://unpkg.com/three-globe/example/img/earth-night.jpg"
        bumpImageUrl="https://unpkg.com/three-globe/example/img/earth-topology.png"
        showAtmosphere={true}
        atmosphereColor="#00FF9C"
        atmosphereAltitude={0.18}
        pointsData={allPoints}
        pointLat={(d: object) => (d as MarkerLike).lat}
        pointLng={(d: object) => (d as MarkerLike).lng}
        pointAltitude={(d: object) => (d as MarkerLike).altitude}
        pointRadius={(d: object) => (d as MarkerLike).size}
        pointColor={(d: object) => (d as MarkerLike).color}
        pointResolution={6}
        pointLabel={(d: object) => {
          const m = d as MarkerLike;
          return `<div style="
            font-family: 'JetBrains Mono', monospace;
            background: rgba(10,14,20,0.95);
            border: 1px solid rgba(0,255,156,0.4);
            color: #00FF9C;
            padding: 6px 10px;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            box-shadow: 0 0 12px rgba(0,255,156,0.2);
          ">
            <div style="font-size:9px;opacity:0.6">${m.category}</div>
            <div>${m.label}</div>
            <div style="font-size:9px;opacity:0.6;margin-top:4px">
              ${m.lat.toFixed(2)}°, ${m.lng.toFixed(2)}°
            </div>
          </div>`;
        }}
        onPointClick={(p: object) => onSelectMarker?.(p as MarkerLike)}
        ringsData={ringsData}
        ringLat={(d: object) => (d as { lat: number }).lat}
        ringLng={(d: object) => (d as { lng: number }).lng}
        ringMaxRadius={(d: object) => (d as { maxR: number }).maxR}
        ringPropagationSpeed={(d: object) => (d as { propagationSpeed: number }).propagationSpeed}
        ringRepeatPeriod={(d: object) => (d as { repeatPeriod: number }).repeatPeriod}
        ringColor={(d: object) => {
          const c = (d as { color: string }).color;
          return () => c;
        }}
        ringAltitude={0.005}
      />
    </div>
  );
}
