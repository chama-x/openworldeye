/**
 * AISStream.io WebSocket — vessel positions (PositionReport only).
 */

export interface VesselState {
  mmsi: string;
  name: string;
  lat: number;
  lon: number;
  sog: number;
  cog: number;
  shipType: number;
  lastSeen: Date;
  darkMinutes?: number;
}

const vessels = new Map<string, VesselState>();

let socket: WebSocket | null = null;
let reconnectAttempts = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
const MAX_RECONNECTS = 3;
const RECONNECT_MS = 10_000;

function clearReconnectTimer() {
  if (reconnectTimer != null) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function parsePositionReport(payload: unknown): void {
  if (!payload || typeof payload !== "object") return;
  const p = payload as Record<string, unknown>;
  const meta = p.MetaData as Record<string, unknown> | undefined;
  const msgWrap = p.Message as Record<string, unknown> | undefined;
  const pos = msgWrap?.PositionReport as Record<string, unknown> | undefined;
  if (!meta || !pos) return;

  const mmsiRaw = meta.MMSI ?? meta.mmsi;
  const mmsi = mmsiRaw != null ? String(mmsiRaw) : "";
  if (!mmsi) return;

  const lat = Number(pos.Latitude ?? pos.latitude);
  const lon = Number(pos.Longitude ?? pos.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

  const name = String(meta.ShipName ?? meta.VesselName ?? meta.shipname ?? "").trim() || "UNKNOWN";
  const sog = Number(pos.Sog ?? pos.SpeedOverGround ?? 0) || 0;
  const cog = Number(pos.Cog ?? pos.CourseOverGround ?? 0) || 0;
  const shipType = Number(meta.Type ?? meta.type ?? meta.ShipType ?? 0) || 0;
  const now = new Date();

  vessels.set(mmsi, {
    mmsi,
    name,
    lat,
    lon,
    sog,
    cog,
    shipType,
    lastSeen: now,
  });
}

function onMessage(ev: MessageEvent) {
  try {
    const msg = JSON.parse(String(ev.data)) as {
      MessageType?: string;
      Message?: { PositionReport?: Record<string, unknown> };
      MetaData?: Record<string, unknown>;
    };
    if (msg.MessageType !== "PositionReport" || !msg.Message?.PositionReport || !msg.MetaData) return;
    parsePositionReport({
      MetaData: msg.MetaData,
      Message: { PositionReport: msg.Message.PositionReport },
    });
  } catch {
    /* ignore malformed */
  }
}

function scheduleReconnect() {
  clearReconnectTimer();
  if (reconnectAttempts >= MAX_RECONNECTS) {
    console.warn("[AISStream] Max reconnect attempts reached; maritime feed idle.");
    return;
  }
  reconnectAttempts += 1;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectAIS();
  }, RECONNECT_MS);
}

export function connectAIS(): void {
  const key = import.meta.env.VITE_AISSTREAM_API_KEY;
  if (!key) {
    console.warn("[AISStream] VITE_AISSTREAM_API_KEY missing; maritime feed disabled.");
    return;
  }

  reconnectAttempts = 0;

  if (socket?.readyState === WebSocket.OPEN || socket?.readyState === WebSocket.CONNECTING) return;

  try {
    socket = new WebSocket("wss://stream.aisstream.io/v0/stream");
  } catch (e) {
    console.warn("[AISStream] WebSocket create failed:", e);
    scheduleReconnect();
    return;
  }

  socket.addEventListener("open", () => {
    try {
      socket?.send(
        JSON.stringify({
          APIKey: key,
          BoundingBoxes: [[[-90, -180], [90, 180]]],
          FilterMessageTypes: ["PositionReport"],
        }),
      );
    } catch (e) {
      console.warn("[AISStream] Subscribe send failed:", e);
    }
  });

  socket.addEventListener("message", onMessage);

  socket.addEventListener("error", () => {
    console.warn("[AISStream] WebSocket error");
  });

  socket.addEventListener("close", () => {
    socket = null;
    scheduleReconnect();
  });
}

export function disconnectAIS(): void {
  clearReconnectTimer();
  reconnectAttempts = MAX_RECONNECTS;
  if (socket) {
    try {
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close();
      }
    } catch {
      /* ignore */
    }
    socket = null;
  }
}

const SNAPSHOT_CAP = 600;

export function getVesselSnapshot(): VesselState[] {
  const now = Date.now();
  const list: VesselState[] = [];
  for (const v of vessels.values()) {
    const darkMinutes = (now - v.lastSeen.getTime()) / 60_000;
    list.push({ ...v, darkMinutes });
  }
  list.sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime());
  return list.slice(0, SNAPSHOT_CAP);
}
