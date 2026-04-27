/** Max aircraft points on the globe to keep WebGL responsive (full count still in data / brief). */
export const MAX_AIRCRAFT_GLOBE_POINTS = 400;

/** ADSB.fi Open Data API base — routed through Vite dev proxy to avoid CORS. */
export const ADSB_FI_BASE = "/api/adsb";

/** Base interval for aircraft polling (ms); useOsintData adds ±1500ms jitter. */
export const AIRCRAFT_POLL_INTERVAL_MS = 12000;

/** Max aircraft records parsed from ADSB responses before mapping. */
export const MAX_AIRCRAFT_PARSE = 500;
