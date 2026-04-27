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
import * as THREE from "three";
import { useOsintSnapshot } from "@/contexts/OsintDataContext";
import { useDataLayers } from "@/contexts/DataLayersContext";
import { useSelection, type EntityType } from "@/contexts/SelectionContext";
import { MAX_AIRCRAFT_GLOBE_POINTS } from "@/lib/constants";
import { aircraftColor, seismicColor } from "@/lib/threat-colors";
import {
  GlobeCameraProvider,
  useGlobeCameraDistance,
  AIRCRAFT_MODEL_OVERLAY_FADE_DIST,
  SATELLITE_MODEL_OVERLAY_FADE_DIST,
} from "@/contexts/GlobeCameraContext";
import GlobeR3FOverlay from "@/components/GlobeR3FOverlay";
import AircraftGlobeLayer from "@/components/globe-layers/AircraftGlobeLayer";
import SatelliteGlobeLayer from "@/components/globe-layers/SatelliteGlobeLayer";
import { buildConflictMarkers } from "@/components/globe-layers/ConflictGlobeLayer";
import { maritimeToMarkers } from "@/components/globe-layers/MaritimeGlobeLayer";
import { gpsJamToMarkers } from "@/components/globe-layers/GpsJamGlobeLayer";
import SelectionVisualLayer from "@/components/globe-layers/SelectionVisualLayer";
import CorrelationArcLayer from "@/components/globe-layers/CorrelationArcLayer";
import AircraftClickProxy from "@/components/globe-layers/AircraftClickProxy";

const AUTO_ROTATE_STORAGE_KEY = "owe.globe.autorotate";

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

export type DeckVisualTheme = "tactical" | "analytic";

export interface CommandGlobeProps {
  /** Tactical = dark earth; analytic = daylight blue marble. */
  visualTheme?: DeckVisualTheme;
}

const GLOBE_TEXTURES: Record<DeckVisualTheme, string> = {
  tactical: "//unpkg.com/three-globe/example/img/earth-dark.jpg",
  analytic: "//unpkg.com/three-globe/example/img/earth-blue-marble.jpg",
};

function readAutoRotatePreference(): boolean {
  try {
    if (typeof window === "undefined") return true;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return false;
    const v = sessionStorage.getItem(AUTO_ROTATE_STORAGE_KEY);
    if (v === "0") return false;
  } catch {
    /* ignore */
  }
  return true;
}

function CommandGlobeContent({
  visualTheme = "tactical",
}: CommandGlobeProps) {
  const { cameraDistance } = useGlobeCameraDistance();
  const { selectedEntity, setSelectedEntity, clearSelection } = useSelection();
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [autoRotate, setAutoRotate] = useState(readAutoRotatePreference);
  const [reduceMotion, setReduceMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches),
  );
  const [atmoPulse, setAtmoPulse] = useState(() => (visualTheme === "analytic" ? 0.12 : 0.18));
  const pulseAnimRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { aircraft, satellites, earthquakes, conflicts, maritime, gpsJam } = useOsintSnapshot();
  const { layer } = useDataLayers();

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => {
      const r = mq.matches;
      setReduceMotion(r);
      if (r) setAutoRotate(false);
    };
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(AUTO_ROTATE_STORAGE_KEY, autoRotate ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [autoRotate]);

  const aircraftForGlobe = useMemo(() => {
    const all = aircraft.data;
    if (all.length <= MAX_AIRCRAFT_GLOBE_POINTS) return all;
    return all.slice(0, MAX_AIRCRAFT_GLOBE_POINTS);
  }, [aircraft.data]);

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

  const effectiveAutoRotate = autoRotate && !reduceMotion;

  const globeImageUrl = GLOBE_TEXTURES[visualTheme];
  const analyticGlobe = visualTheme === "analytic";

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
    ctrl.enableDamping = true;
    ctrl.dampingFactor = 0.08;
    ctrl.minDistance = 150;
    ctrl.maxDistance = 600;
    globeRef.current.pointOfView({ lat: 25, lng: 20, altitude: 2.5 }, 1500);
  }, []);

  useEffect(() => {
    if (!globeRef.current) return;
    const ctrl = globeRef.current.controls() as {
      autoRotate: boolean;
      autoRotateSpeed: number;
    };
    ctrl.autoRotate = effectiveAutoRotate;
    ctrl.autoRotateSpeed = reduceMotion ? 0 : 0.35;
  }, [effectiveAutoRotate, reduceMotion]);

  useEffect(() => {
    if (reduceMotion) {
      setAtmoPulse(visualTheme === "analytic" ? 0.12 : 0.18);
      return;
    }
    const base = visualTheme === "analytic" ? 0.12 : 0.18;

    const startPulse = () => {
      let t = 0;
      pulseAnimRef.current = setInterval(() => {
        t += 0.04;
        setAtmoPulse(base + Math.sin(t) * 0.035);
      }, 50);
    };

    const resetIdle = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (pulseAnimRef.current) clearInterval(pulseAnimRef.current);
      setAtmoPulse(base);
      idleTimerRef.current = setTimeout(startPulse, 5000);
    };

    window.addEventListener("pointermove", resetIdle);
    window.addEventListener("pointerdown", resetIdle);
    resetIdle();

    return () => {
      window.removeEventListener("pointermove", resetIdle);
      window.removeEventListener("pointerdown", resetIdle);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (pulseAnimRef.current) clearInterval(pulseAnimRef.current);
    };
  }, [reduceMotion, visualTheme]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "f" || e.key === "F") {
        globeRef.current?.pointOfView({ lat: 25, lng: 20, altitude: 2.5 }, 1000);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Phase 2: Camera Behavior on Selection
  useEffect(() => {
    if (!globeRef.current || !selectedEntity) return;
    const currentView = globeRef.current.pointOfView();
    // Gentle zoom to 85% of current altitude
    const newAltitude = Math.max(0.1, currentView.altitude * 0.85);
    globeRef.current.pointOfView(
      { lat: selectedEntity.lat, lng: selectedEntity.lon, altitude: newAltitude },
      1200
    );
  }, [selectedEntity]);

  const aircraftPoints = useMemo<MarkerLike[]>(
    () =>
      aircraftForGlobe.map((a) => ({
        lat: a.latitude,
        lng: a.longitude,
        altitude: Math.max(0.005, a.altitude / 100000),
        size: 0.18,
        color: aircraftColor(a.altitude),
        label: `${a.callsign} • ${a.origin_country}`,
        category: "AIRCRAFT",
        raw: a,
      })),
    [aircraftForGlobe],
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
        color: seismicColor(e.magnitude),
        label: `M${e.magnitude} • ${e.place}`,
        category: "EARTHQUAKE",
        raw: e,
      })),
    [earthquakes.data],
  );

  const { markers: conflictPoints, rings: conflictRingsFromEvents } = useMemo(
    () => buildConflictMarkers(conflicts.data),
    [conflicts.data],
  );

  const maritimePoints = useMemo(
    () => (layer("maritime").active ? maritimeToMarkers(maritime.data) : []),
    [maritime.data, layer],
  );

  const gpsJamPoints = useMemo(
    () => (layer("gpsjam").active ? gpsJamToMarkers(gpsJam.data) : []),
    [gpsJam.data, layer],
  );

  const allPoints = useMemo(
    () => [
      ...aircraftPoints,
      ...satellitePoints,
      ...earthquakePoints,
      ...conflictPoints,
      ...maritimePoints,
      ...gpsJamPoints,
    ],
    [aircraftPoints, satellitePoints, earthquakePoints, conflictPoints, maritimePoints, gpsJamPoints],
  );

  const hideAircraftGlobePoints =
    layer("aircraft").active && cameraDistance < AIRCRAFT_MODEL_OVERLAY_FADE_DIST;
  const hideSatelliteGlobePoints =
    layer("satellites").active && cameraDistance < SATELLITE_MODEL_OVERLAY_FADE_DIST;

  const ringsData = useMemo(
    () => (layer("conflicts").active ? conflictRingsFromEvents : []),
    [layer, conflictRingsFromEvents],
  );

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden">
      <div className="pointer-events-none absolute bottom-3 left-3 z-30 flex flex-col gap-1">
        <button
          type="button"
          disabled={reduceMotion}
          aria-pressed={effectiveAutoRotate}
          aria-label={reduceMotion ? "Globe auto-rotate off (reduce motion)" : "Toggle globe auto-rotate"}
          title={
            reduceMotion
              ? "Auto-rotate disabled while Reduce Motion is on"
              : effectiveAutoRotate
                ? "Turn off globe auto-rotate"
                : "Turn on globe auto-rotate"
          }
          onClick={() => setAutoRotate((v) => !v)}
          className={
            analyticGlobe
              ? "pointer-events-auto rounded border border-slate-300 bg-white/90 px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-slate-800 shadow-lg hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              : "pointer-events-auto rounded border border-[rgba(0,255,156,0.35)] bg-[rgba(10,14,20,0.92)] px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-[#00FF9C] shadow-lg hover:bg-[rgba(0,255,156,0.08)] disabled:cursor-not-allowed disabled:opacity-40"
          }
        >
          Rotate {effectiveAutoRotate ? "on" : "off"}
        </button>
      </div>
      <Globe
        ref={globeRef}
        width={size.width}
        height={size.height}
        backgroundColor="rgba(0,0,0,0)"
        globeImageUrl={globeImageUrl}
        bumpImageUrl="https://unpkg.com/three-globe/example/img/earth-topology.png"
        showAtmosphere={true}
        atmosphereColor={analyticGlobe ? "#7dd3fc" : "#00FF9C"}
        atmosphereAltitude={atmoPulse}
        pointsData={allPoints}
        pointLat={(d: object) => (d as MarkerLike).lat}
        pointLng={(d: object) => (d as MarkerLike).lng}
        pointAltitude={(d: object) => (d as MarkerLike).altitude}
        pointRadius={(d: object) => (d as MarkerLike).size}
        pointColor={(d: object) => {
          const m = d as MarkerLike;
          if (m.category === "AIRCRAFT" && hideAircraftGlobePoints) return "rgba(0,0,0,0)";
          if (m.category === "SATELLITE" && hideSatelliteGlobePoints) return "rgba(0,0,0,0)";
          return m.color;
        }}
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
        onPointClick={(p: object) => {
          const m = p as MarkerLike;
          
          let entityType: EntityType;
          switch (m.category) {
            case "AIRCRAFT": entityType = "aircraft"; break;
            case "SATELLITE": entityType = "satellite"; break;
            case "EARTHQUAKE": entityType = "earthquake"; break;
            case "CONFLICT": entityType = "conflict"; break;
            case "MARITIME": entityType = "vessel"; break;
            case "GPSJAM": entityType = "gpsjam"; break;
            default: return; // Should not happen
          }
          
          let id = "";
          if (entityType === "aircraft") id = (m.raw as any).icao24 || (m.raw as any).hex;
          else if (entityType === "vessel") id = (m.raw as any).mmsi;
          else if (entityType === "conflict") id = (m.raw as any).id;
          else if (entityType === "satellite") id = (m.raw as any).noradId;
          else if (entityType === "earthquake") id = (m.raw as any).id;
          else if (entityType === "gpsjam") id = `${m.lat}-${m.lng}`;

          setSelectedEntity({
            type: entityType,
            id: id,
            lat: m.lat,
            lon: m.lng,
            data: m.raw as Record<string, unknown>,
            selectedAt: new Date()
          });
        }}
        onGlobeClick={clearSelection}
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

      <GlobeR3FOverlay globeRef={globeRef} width={size.width} height={size.height} eventSource={containerRef}>
        <ambientLight intensity={0.4} />
        <directionalLight position={[120, 60, 80]} intensity={1.8} castShadow={false} />
        <directionalLight position={[-100, -50, -100]} intensity={0.25} color="#3355aa" />

        <AircraftGlobeLayer 
          data={aircraftForGlobe} 
          visible={layer("aircraft").active} 
          selectedIcao={selectedEntity?.type === "aircraft" ? selectedEntity.id : null}
        />
        <AircraftClickProxy
          data={aircraftForGlobe}
          visible={layer("aircraft").active && cameraDistance < AIRCRAFT_MODEL_OVERLAY_FADE_DIST}
        />

        <SatelliteGlobeLayer data={satellites.data} visible={layer("satellites").active} />
        
        <SelectionVisualLayer />
        <CorrelationArcLayer />

        {/* Invisible globe sphere — clicking it clears selection */}
        <mesh onClick={clearSelection}>
          <sphereGeometry args={[100, 32, 16]} />
          <meshBasicMaterial visible={false} side={THREE.BackSide} />
        </mesh>
      </GlobeR3FOverlay>
    </div>
  );
}

export default function CommandGlobe(props: CommandGlobeProps) {
  return (
    <GlobeCameraProvider>
      <CommandGlobeContent {...props} />
    </GlobeCameraProvider>
  );
}
