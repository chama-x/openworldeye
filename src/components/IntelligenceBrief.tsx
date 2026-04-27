import { useCallback, useMemo, useState, useRef, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useOsintSnapshot } from "@/contexts/OsintDataContext";
import { useSelection } from "@/contexts/SelectionContext";
import type { DeckVisualTheme } from "@/components/CommandGlobe";
import { seismicColor, THREAT } from "@/lib/threat-colors";
import type { OsintSnapshot } from "@/contexts/OsintDataContext";
import type { Aircraft, MaritimeData, ConflictEvent } from "@/lib/osint-services";

import { AircraftModelPicker } from "@/components/models/AircraftModelPicker";
import { ISSModel } from "@/components/models/ISSModel";
import { GeoSatelliteModel } from "@/components/models/GeoSatelliteModel";

interface IntelligenceBriefProps {
  visualTheme?: DeckVisualTheme;
}

const BLUF_SYSTEM_PROMPT = `You are a military intelligence analyst producing a structured situation report. 
Respond ONLY in this exact format with no preamble:

ASSESSMENT: [One sentence bottom-line conclusion about the most significant pattern in the data]
CONFIDENCE: [HIGH / MEDIUM / LOW] — [one sentence explaining why]
KEY SIGNALS:
- [Signal 1: layer name — specific observation]
- [Signal 2: layer name — specific observation]  
- [Signal 3: layer name — specific observation]
ANOMALIES: [Any disappearances, unusual concentrations, or cross-layer correlations worth flagging. If none: NONE DETECTED]
GAPS: [What data is missing, stale, or uncorroborated that would change the assessment]
WATCHLIST: [Specific entities, coordinates, or regions requiring continued monitoring. If none: CLEAR]`;

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function EntityModel({ selectedEntity }: { selectedEntity: any }) {
  const groupRef = useRef<THREE.Group>(null);
  const type = selectedEntity.type;
  const data = selectedEntity.data;

  // Heading setup
  const heading = data.heading ?? data.cog ?? 0;

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.003;
    }
  });

  if (type === "aircraft") {
    const ac = data as Aircraft;
    return (
      <group ref={groupRef}>
        <group rotation={[0.3, 0, 0]}>
          <group rotation={[0, (-heading * Math.PI) / 180, 0]}>
            <AircraftModelPicker typeCode={ac.typeCode} scale={2.5} />
          </group>
        </group>
      </group>
    );
  }

  if (type === "satellite") {
    const isIss = (data.name || "").toUpperCase().includes("ISS");
    return (
      <group ref={groupRef}>
        {isIss ? <ISSModel scale={0.1} /> : <GeoSatelliteModel scale={0.2} />}
      </group>
    );
  }

  if (type === "vessel") {
    return (
      <group ref={groupRef}>
        <group rotation={[0, (-heading * Math.PI) / 180, 0]}>
          <mesh position={[0, 0.5, 0]}>
            <boxGeometry args={[1, 1, 4]} />
            <meshStandardMaterial color="#444" roughness={0.7} />
          </mesh>
          <mesh position={[0, 1.25, -0.5]}>
            <boxGeometry args={[0.8, 0.5, 1]} />
            <meshStandardMaterial color="#ddd" roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.5, 2]}>
            <cylinderGeometry args={[0.01, 0.5, 1, 3]} />
            <meshStandardMaterial color="#444" roughness={0.7} />
          </mesh>
        </group>
      </group>
    );
  }

  if (type === "conflict") {
    return (
      <group ref={groupRef}>
        <gridHelper args={[10, 10, "#FF3333", "#444"]} position={[0, -0.5, 0]} />
        <mesh position={[0, 0.5, 0]}>
          <octahedronGeometry args={[0.5]} />
          <meshStandardMaterial color="#FF3333" wireframe />
        </mesh>
      </group>
    );
  }

  if (type === "earthquake") {
    const mag = data.magnitude || 5;
    return (
      <group ref={groupRef}>
        <mesh>
          <sphereGeometry args={[mag * 0.2, 16, 16]} />
          <meshStandardMaterial color="#FFB800" wireframe transparent opacity={0.6} />
        </mesh>
      </group>
    );
  }

  if (type === "gpsjam") {
    return (
      <group ref={groupRef}>
        <mesh>
          <torusGeometry args={[1, 0.1, 16, 32]} />
          <meshStandardMaterial color="#FF6B00" wireframe />
        </mesh>
      </group>
    );
  }

  return null;
}

function EntityViewport({ selectedEntity }: { selectedEntity: any }) {
  return (
    <div className="h-[240px] w-full bg-slate-900 overflow-hidden relative border-b border-slate-700/50">
      <Canvas camera={{ position: [5, 3, 5], fov: 45 }}>
        <ambientLight color="#aabbff" intensity={0.4} />
        <directionalLight color="#ffffff" position={[10, 10, 5]} intensity={1.5} />
        <EntityModel selectedEntity={selectedEntity} />
      </Canvas>
      <div className="absolute top-2 left-2 pointer-events-none">
        <div className="font-mono text-[9px] text-[#00FF9C] opacity-70 tracking-widest uppercase">
          {selectedEntity.type} TRACK
        </div>
      </div>
    </div>
  );
}

function buildBlufUserPrompt(osint: OsintSnapshot, selectedEntity?: any, localContext?: any): string {
  const utcWall = new Date().toISOString().slice(0, 19) + "Z";
  let base = `Current UTC: ${utcWall}\n`;

  if (selectedEntity && localContext) {
    base += `FOCUS ENTITY: ${selectedEntity.type.toUpperCase()} ID: ${selectedEntity.id}\n`;
    base += `LOCATION: ${selectedEntity.lat.toFixed(4)}, ${selectedEntity.lon.toFixed(4)}\n`;
    base += `LOCAL CONTEXT (500km radius):\n`;
    base += `- Aircraft: ${localContext.air}\n`;
    base += `- Vessels: ${localContext.sea}\n`;
    base += `- Conflicts: ${localContext.ops}\n`;
    base += `- GPS Jamming: ${localContext.jam ? "YES" : "NO"}\n`;
    base += `\nProvide an assessment focused on this entity's operational context.`;
  } else {
    // Global summary
    base += `AIRCRAFT: ${osint.aircraft.data.length} tracked.\n`;
    base += `MARITIME: ${osint.maritime.data.length} vessels tracked.\n`;
    base += `CONFLICTS: ${osint.conflicts.data.length} events in last 30 days.\n`;
    base += `EARTHQUAKES: ${osint.earthquakes.data.length} events M2.5+.\n`;
    base += `SATELLITES: ${osint.satellites.data.length} tracked overhead.\n`;
    base += `Analyze the above and produce your assessment.`;
  }
  
  return base;
}

function blufLineClass(line: string, analytic: boolean): string {
  const t = line.trim();
  const base = "whitespace-pre-wrap break-words";
  if (t.startsWith("ASSESSMENT:")) return analytic ? `${base} font-semibold text-slate-900` : `${base} font-semibold text-[#f0f4f8]`;
  if (t.startsWith("CONFIDENCE:")) {
    if (/\bHIGH\b/i.test(t)) return analytic ? `${base} text-emerald-700` : `${base} text-[#00FF9C]`;
    if (/\bMEDIUM\b/i.test(t)) return analytic ? `${base} text-amber-700` : `${base} text-[#FFB800]`;
    if (/\bLOW\b/i.test(t)) return analytic ? `${base} text-red-600` : `${base} text-[#FF3333]`;
    return analytic ? `${base} text-slate-800` : `${base} text-[rgba(230,238,248,0.88)]`;
  }
  if (t.startsWith("ANOMALIES:")) {
    if (/NONE DETECTED/i.test(t)) return analytic ? `${base} text-slate-600` : `${base} text-[rgba(230,238,248,0.55)]`;
    return analytic ? `${base} text-orange-700` : `${base} text-[#FF9500]`;
  }
  if (t.startsWith("WATCHLIST:")) {
    if (/\bCLEAR\b/i.test(t)) return analytic ? `${base} text-slate-600` : `${base} text-[rgba(230,238,248,0.55)]`;
    return analytic ? `${base} text-red-700` : `${base} text-[#FF3333]`;
  }
  if (t.startsWith("KEY SIGNALS:") || t.startsWith("GAPS:")) return analytic ? `${base} text-slate-700` : `${base} text-[rgba(230,238,248,0.75)]`;
  if (t.startsWith("-")) return analytic ? `${base} text-slate-600` : `${base} text-[rgba(230,238,248,0.65)]`;
  return analytic ? `${base} text-slate-700` : `${base} text-[rgba(230,238,248,0.8)]`;
}

function BlufFormatted({ text, analytic }: { text: string; analytic: boolean }): ReactNode {
  const lines = text.split("\n");
  return (
    <div className="space-y-0.5 font-mono text-[10px] leading-relaxed">
      {lines.map((line, i) => (
        <p key={i} className={blufLineClass(line, analytic)}>{line || " "}</p>
      ))}
    </div>
  );
}

export default function IntelligenceBrief({ visualTheme = "tactical" }: IntelligenceBriefProps) {
  const osint = useOsintSnapshot();
  const { selectedEntity, clearSelection, setSelectedEntity } = useSelection();
  
  const [llmOut, setLlmOut] = useState<string | null>(null);
  const [llmBusy, setLlmBusy] = useState(false);
  const [llmErr, setLlmErr] = useState<string | null>(null);

  const counts = useMemo(() => ({
    air: osint.aircraft.data.length,
    orb: osint.satellites.data.length,
    seis: osint.earthquakes.data.length,
    ops: osint.conflicts.data.length,
    sea: osint.maritime.data.length,
    jam: osint.gpsJam.data.length,
  }), [osint]);

  // Local context calculation for selected entity (500km radius)
  const localContext = useMemo(() => {
    if (!selectedEntity) return null;
    let air = 0, sea = 0, ops = 0, jam = false;
    const lat = selectedEntity.lat;
    const lon = selectedEntity.lon;
    
    for (const a of osint.aircraft.data) {
      if (a.icao24 !== selectedEntity.id && distanceKm(lat, lon, a.latitude, a.longitude) <= 500) air++;
    }
    for (const v of osint.maritime.data) {
      if (v.mmsi !== selectedEntity.id && distanceKm(lat, lon, v.lat, v.lon) <= 500) sea++;
    }
    for (const c of osint.conflicts.data) {
      if (c.id !== selectedEntity.id && distanceKm(lat, lon, c.lat, c.lon) <= 500) ops++;
    }
    for (const j of osint.gpsJam.data) {
      if (distanceKm(lat, lon, j.lat, j.lon) <= 500) { jam = true; break; }
    }
    return { air, sea, ops, jam };
  }, [selectedEntity, osint]);

  const runGroq = useCallback(async () => {
    const key = import.meta.env.VITE_GROQ_API_KEY;
    if (!key) {
      setLlmErr("Set VITE_GROQ_API_KEY for synthesis.");
      return;
    }
    setLlmBusy(true);
    setLlmErr(null);
    setLlmOut(null);
    const model = import.meta.env.VITE_GROQ_MODEL ?? "llama-3.1-8b-instant";
    
    const prompt = buildBlufUserPrompt(osint, selectedEntity, localContext);
    
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: BLUF_SYSTEM_PROMPT },
            { role: "user", content: prompt },
          ],
          max_tokens: 512,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as any;
      const text = json.choices?.[0]?.message?.content?.trim() ?? "";
      setLlmOut(text || "(empty response)");
    } catch (e) {
      setLlmErr(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLlmBusy(false);
    }
  }, [osint, selectedEntity, localContext]);

  const a = visualTheme === "analytic";

  const statTiles = [
    { label: "AIR", icon: "✈", count: counts.air, color: "#00FF9C" },
    { label: "ORB", icon: "◉", count: counts.orb, color: "#7DD3FC" },
    { label: "SEIS", icon: "▲", count: counts.seis, color: seismicColor(5) },
    { label: "OPS", icon: "✶", count: counts.ops, color: THREAT.CRITICAL },
    { label: "SEA", icon: "⚓", count: counts.sea, color: THREAT.INTEL },
    { label: "JAM", icon: "◎", count: counts.jam, color: "#FFB800" },
  ];

  return (
    <div className={a ? "flex h-full min-h-0 flex-col rounded-none bg-white" : "tactical-panel flex h-full min-h-0 flex-col"}>
      <div className="tactical-panel-header">
        <span>Intelligence</span>
        <span className="flex items-center gap-2">
          <span className={a ? "text-slate-500" : "text-[rgba(0,255,156,0.45)]"}>BRIEF</span>
          {selectedEntity && (
            <button
              onClick={clearSelection}
              className="rounded border border-[rgba(0,255,156,0.35)] px-2 py-0.5 font-mono text-[9px] uppercase text-[#00FF9C] hover:bg-[rgba(0,255,156,0.1)]"
            >
              Close
            </button>
          )}
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {selectedEntity ? (
          // --- ENTITY MODE ---
          <div className="flex flex-col h-full">
            <EntityViewport selectedEntity={selectedEntity} />
            
            <div className="p-3 space-y-4 flex-1">
              <section>
                <h3 className="mb-2 font-mono text-[10px] uppercase text-[rgba(0,255,156,0.5)] tracking-widest">Entity Details</h3>
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                  <div className="text-[rgba(230,238,248,0.6)]">Type</div>
                  <div className="text-[#00FF9C]">{selectedEntity.type.toUpperCase()}</div>
                  <div className="text-[rgba(230,238,248,0.6)]">ID</div>
                  <div className="text-white truncate">{selectedEntity.id}</div>
                  <div className="text-[rgba(230,238,248,0.6)]">Location</div>
                  <div className="text-white">{selectedEntity.lat.toFixed(3)}°, {selectedEntity.lon.toFixed(3)}°</div>
                  
                  {/* Type-specific details */}
                  {selectedEntity.type === 'aircraft' && (
                    <>
                      <div className="text-[rgba(230,238,248,0.6)]">Altitude</div>
                      <div className="text-white">{((selectedEntity.data as unknown as Aircraft).altitude ?? 0).toLocaleString()} m</div>
                      <div className="text-[rgba(230,238,248,0.6)]">Velocity</div>
                      <div className="text-white">{((selectedEntity.data as unknown as Aircraft).velocity ?? 0).toFixed(0)} m/s</div>
                    </>
                  )}
                  {selectedEntity.type === 'vessel' && (
                    <>
                      <div className="text-[rgba(230,238,248,0.6)]">Heading</div>
                      <div className="text-white">{((selectedEntity.data as unknown as MaritimeData).cog ?? 0).toFixed(0)}°</div>
                      <div className="text-[rgba(230,238,248,0.6)]">SOG</div>
                      <div className="text-white">{((selectedEntity.data as unknown as MaritimeData).sog ?? 0).toFixed(1)} knots</div>
                      <div className="text-[rgba(230,238,248,0.6)]">Dark Status</div>
                      <div className={((selectedEntity.data as unknown as MaritimeData).darkMinutes ?? 0) > 0 ? "text-[#FFB800]" : "text-[#00FF9C]"}>
                        {((selectedEntity.data as unknown as MaritimeData).darkMinutes ?? 0) > 0 ? `${(selectedEntity.data as unknown as MaritimeData).darkMinutes}m` : "LIVE"}
                      </div>
                    </>
                  )}
                  {selectedEntity.type === 'conflict' && (
                    <>
                      <div className="text-[rgba(230,238,248,0.6)]">Fatalities</div>
                      <div className="text-[#FF3333]">{((selectedEntity.data as unknown as ConflictEvent).fatalities ?? 0)}</div>
                      <div className="text-[rgba(230,238,248,0.6)]">Event Type</div>
                      <div className="text-white truncate">{((selectedEntity.data as unknown as ConflictEvent).eventType ?? "")}</div>
                    </>
                  )}
                </div>
              </section>

              <section>
                <h3 className="mb-2 font-mono text-[10px] uppercase text-[rgba(0,255,156,0.5)] tracking-widest">Local Context (500km)</h3>
                <div className="grid grid-cols-4 gap-2">
                  <div className="p-2 border border-[rgba(0,255,156,0.2)] bg-[rgba(0,255,156,0.05)] rounded flex flex-col items-center">
                    <span className="text-[#00FF9C] text-[12px] font-bold">{localContext?.air}</span>
                    <span className="text-[8px] text-[rgba(230,238,248,0.5)] uppercase mt-1">Air</span>
                  </div>
                  <div className="p-2 border border-[rgba(125,211,252,0.2)] bg-[rgba(125,211,252,0.05)] rounded flex flex-col items-center">
                    <span className="text-[#7DD3FC] text-[12px] font-bold">{localContext?.sea}</span>
                    <span className="text-[8px] text-[rgba(230,238,248,0.5)] uppercase mt-1">Sea</span>
                  </div>
                  <div className="p-2 border border-[rgba(255,51,51,0.2)] bg-[rgba(255,51,51,0.05)] rounded flex flex-col items-center">
                    <span className="text-[#FF3333] text-[12px] font-bold">{localContext?.ops}</span>
                    <span className="text-[8px] text-[rgba(230,238,248,0.5)] uppercase mt-1">Ops</span>
                  </div>
                  <div className={`p-2 border rounded flex flex-col items-center ${localContext?.jam ? 'border-[#FFB800] bg-[rgba(255,184,0,0.1)]' : 'border-[rgba(255,255,255,0.1)] bg-[rgba(0,0,0,0.2)]'}`}>
                    <span className={localContext?.jam ? 'text-[#FFB800]' : 'text-[rgba(255,255,255,0.3)]'}>{localContext?.jam ? 'YES' : 'NO'}</span>
                    <span className="text-[8px] text-[rgba(230,238,248,0.5)] uppercase mt-1">Jam</span>
                  </div>
                </div>
              </section>
            </div>
          </div>
        ) : (
          // --- DEFAULT MODE ---
          <div className="p-3 space-y-4">
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {statTiles.map(({ label, icon, count, color }) => (
                <div key={label} style={{ borderColor: `${color}22`, background: `${color}08` }} className="rounded border p-2">
                  <div className="mb-0.5 flex items-center justify-between">
                    <span className={`font-mono text-[9px] tracking-widest opacity-50`}>{label}</span>
                    <span style={{ color }} className="text-[11px]">{icon}</span>
                  </div>
                  <span style={{ color }} className="font-mono text-lg font-bold leading-none tabular-nums">{count.toLocaleString()}</span>
                </div>
              ))}
            </div>

            <section>
              <h3 className="mb-2 font-mono text-[10px] uppercase text-[rgba(0,255,156,0.5)] tracking-widest">Active Correlations</h3>
              <div className="space-y-2">
                {/* Note: This will be populated when OsintSnapshot gets correlations */}
                {((osint as any).correlations || []).length > 0 ? (
                  ((osint as any).correlations).map((corr: any, idx: number) => (
                    <div 
                      key={idx} 
                      className="p-2 border border-[rgba(255,184,0,0.3)] bg-[rgba(255,184,0,0.05)] rounded cursor-pointer hover:bg-[rgba(255,184,0,0.1)]"
                      onClick={() => {
                         // Focus on the primary entity of this correlation
                         if (corr.primaryEntity) setSelectedEntity(corr.primaryEntity);
                      }}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-mono text-[9px] text-[#FFB800] uppercase">{corr.type}</span>
                        <span className="font-mono text-[9px] bg-[#FFB800] text-black px-1 rounded">Score {corr.score}</span>
                      </div>
                      <p className="text-[10px] font-mono text-[rgba(230,238,248,0.8)]">{corr.description}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-[9px] font-mono text-[rgba(230,238,248,0.4)] text-center py-4 border border-dashed border-[rgba(255,255,255,0.1)] rounded">
                    Monitoring for behavioral correlations...
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>

      <section className="mt-auto border-t border-[rgba(0,255,156,0.1)] p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="font-mono text-[10px] uppercase tracking-widest text-[rgba(0,255,156,0.5)]">
            LLM Synthesis
          </h3>
          <button
            type="button"
            disabled={llmBusy}
            onClick={() => void runGroq()}
            className="rounded bg-[rgba(0,255,156,0.08)] px-2 py-1 font-mono text-[9px] uppercase text-[#00FF9C] ring-1 ring-[rgba(0,255,156,0.22)] hover:bg-[rgba(0,255,156,0.16)] disabled:opacity-40"
          >
            {llmBusy ? "…" : "Synthesize"}
          </button>
        </div>
        {llmErr && <p className="font-mono text-[10px] text-[#FF3333]">{llmErr}</p>}
        {llmOut && (
          <div className="mt-2 rounded border border-[rgba(0,255,156,0.12)] bg-[rgba(0,0,0,0.25)] p-2">
            <BlufFormatted text={llmOut} analytic={a} />
          </div>
        )}
      </section>
    </div>
  );
}
