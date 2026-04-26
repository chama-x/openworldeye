# WorldView Intelligence Report: Geospatial Command Center Recreation

> **OpenWorldEye** is the product name for this repository (display: **OPEN WORLD EYE**). Here, **WorldView** refers to Bilawal Sidhu’s reference OSINT command-center project—not our branding. Third-party names (NASA Worldview, `osint-worldview`, etc.) stay as cited.

This report provides a comprehensive map of resources, endpoints, and technical specifications required to recreate **WorldView**, the OSINT geospatial command center developed by Bilawal Sidhu.

---

## 1. Project Overview
WorldView is a **4D geospatial command center** that fuses real-time public data layers onto a 3D globe. It enables the reconstruction of complex global events (e.g., military strikes, maritime crises) using only open-source intelligence (OSINT).

### Core Philosophy
- **Democratized Intelligence:** Moving beyond the "intelligence monopoly" of states and large corporations.
- **Vibe-Coding:** Leveraging AI agent swarms (Claude, Gemini, Cursor) to build complex geospatial infrastructure in days rather than months.
- **4D Reconstruction:** Fusing 3D space with a temporal timeline for minute-by-minute event replays.

---

## 2. Technical Stack & Architecture

### Visualization Engine
| Component | Technology | Purpose |
|---|---|---|
| **3D Globe Engine** | **CesiumJS** | Industry standard for 3D tiles, orbital paths, and high-precision geospatial rendering. |
| **Volumetric Data** | **Google Photorealistic 3D Tiles API** | Provides global photogrammetry and volumetric city models. |
| **Alternative Engine** | **globe.gl (Three.js)** | Used for simpler, high-performance 3D globe visualizations with clustering. |
| **Flat Map Engine** | **deck.gl** | High-performance WebGL-based visualization for large datasets on flat maps. |

### AI Agent Toolchain
- **LLMs:** Claude 4.6 (Architecture/Analysis), Gemini 3.1 (Geospatial data processing).
- **IDE:** Cursor (AI-powered development).
- **Deployment:** Replit (Rapid hosting and environment setup).
- **Connectivity:** MCP (Model Context Protocol) for connecting agents to live data tools.

---

## 3. The 6 Critical Data Layers & API Endpoints

### Layer 1: Commercial & Military Flight Tracking (ADS-B)
- **ADS-B Exchange:** `https://adsbexchange.com/api/aircraft/lat/{lat}/lon/{lon}/dist/{nm}/`
- **OpenSky Network:** `https://opensky-network.org/api/states/all` (Anonymous access available).
- **adsb.fi:** `https://api.adsb.fi/v3/lat/{lat}/lon/{lon}/dist/{dist}` (Open data API).

### Layer 2: Satellite Orbital Tracking (TLE Data)
- **CelesTrak:** `https://celestrak.org/NORAD/elements/` (Standard for NORAD TLE sets).
- **Space-Track.org:** Official NORAD catalog (Requires account).
- **TLE API:** `https://tle.ivanstanojevic.me/` (Developer-friendly JSON format).

### Layer 3: GPS Jamming & Interference
- **GPSJam.org:** Aggregates ADS-B GPS confidence signals to map interference zones.
- **OpenSky Data:** Inference from flight state degradation fields in the OpenSky API.

### Layer 4: Maritime AIS Tracking
- **AISStream:** `https://aisstream.io/` (Real-time AIS data stream).
- **MarineTraffic:** Commercial API for global vessel positions.
- **AIS-catcher:** `github.com/jvde-github/AIS-catcher` (Open-source self-hosted AIS receiver).

### Layer 5: No-Fly Zones & NOTAMs
- **FAA NOTAM API:** `https://api.faa.gov/notamapi/v1/notams` (Official US NOTAMs).
- **OurAirports.com:** `https://ourairports.com/data/` (Free airport and navigation data).

### Layer 6: Conflict Events & Strike Coordinates
- **ACLED:** `https://api.acleddata.com/` (Conflict location and event data, free tier available).
- **NASA FIRMS:** `https://firms.modaps.eosdis.nasa.gov/api/` (Near real-time active fire/explosion data).
- **LiveUAMap:** OSINT event aggregator for real-time conflict mapping.

---

## 4. Open-Source Implementations for Study

### [ARGUS](https://github.com/0xhav0c/ARGUS)
- **Architecture:** Electron + React + CesiumJS + SQLite.
- **Significance:** Most similar to WorldView's "command center" feel. Features multi-domain feeds, AI analysis, and offline-first caching.

### [OSINT-WorldView](https://github.com/amanimran786/osint-worldview)
- **Architecture:** Vite + React + Node.js + globe.gl.
- **Significance:** High-quality clone with 45 data layers and a 4-tier AI fallback chain (Ollama/Groq).

### [Conflict-Globe.gl](https://github.com/r13xr13/conflict-globe.gl)
- **Architecture:** React + Socket.io + globe.gl.
- **Significance:** Excellent example of real-time WebSocket-driven data updates and spatial clustering.

### [Sat-Vis](https://github.com/boostedspaceprogram/sat-vis)
- **Architecture:** Pure static JS + CesiumJS + satellite.js.
- **Significance:** Best reference for orbital propagation and rendering satellite paths without a backend.

---

## 5. Phase 1 Implementation Checklist
1. **Infrastructure:** Set up a Cesium Ion account and obtain a Google Maps 3D Tiles API key.
2. **Data Ingestion:** Create a Node.js/Python service to poll OpenSky and CelesTrak APIs.
3. **AI Integration:** Configure a Cursor/Claude environment with MCP to automate data normalization.
4. **Visualization:** Initialize a CesiumJS globe and overlay a live ADS-B flight layer as a first milestone.
5. **Temporal Sync:** Implement a global "Time Machine" state to synchronize all data layers to a specific timestamp.
