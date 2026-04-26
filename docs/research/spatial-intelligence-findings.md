# Spatial Intelligence - WorldView Project Findings

> **OpenWorldEye** = our product identity. **WorldView** in this note = the inspirational / third-party stack and articles (see [`BRANDING.md`](../../BRANDING.md) at repo root).

## Core Project: WorldView
- **Creator:** Bilawal Sidhu (former Google Maps product manager, worked on ARCore Geospatial API, Immersive View).
- **Description:** A geospatial command center that fuses open-source intelligence (OSINT) feeds onto a 3D globe.
- **Key Features:**
    - 4D reconstruction (3D space + time) of events (e.g., Iran strikes / Operation Epic Fury).
    - Fuses satellite, aerial, and ground-level imagery.
    - Uses AI agent swarms to snapshot data feeds, normalize formats, and align coordinate systems.
    - Replayable and scrubbable minute-by-minute visualization.

## Technical Components Mentioned:
- **AI Agents:** Used for data engineering, snapshotting feeds, and cleaning timestamps.
- **Data Sources:** Open-source intelligence (OSINT), public data feeds, commercial satellites, airspace shutdown data.
- **Visualization:** 3D globe (likely CesiumJS, Mapbox, or similar), browser-based.
- **Input Method:** Creator mentioned sending a WhatsApp message to his AI agent to start the process.

## Key References:
- [I built WorldView](https://www.spatialintelligence.ai/p/i-built-a-spy-satellite-simulator) (Internal link to be explored)
- [One Chokepoint Controls Everything](https://www.spatialintelligence.ai/p/one-chokepoint-controls-everything) (Related project)
- Bilawal Sidhu's Twitter: [@bilawalsidhu](https://x.com/bilawalsidhu)
- Mention of "vibe-coded Palantir" and response from Palantir co-founder.

## Mission:
- Democratizing "God's Eye View" intelligence using public data and AI, moving beyond the "intelligence monopoly" of large states or corporations.

## Detailed Technical Stack for WorldView:

### 1. Core 3D Visualization Engine:
- **Google Photorealistic 3D Tiles API:** Provides the volumetric city models and global photogrammetry.
- **CesiumJS / Mapbox:** Likely used as the client-side library to render the 3D tiles and overlay data (Cesium is standard for 3D tiles and orbital paths).

### 2. Real-Time Data Feeds (Endpoints):
- **OpenSky Network:** Live aircraft positions (7,000+). [API Documentation](https://opensky-network.org/apidoc/)
- **ADS-B Exchange:** Crowdsourced military flight tracking. [API Documentation](https://www.adsbexchange.com/data/)
- **CelesTrak:** Satellite TLE (Two-Line Element) data for orbital tracking. [CelesTrak API](https://celestrak.org/NORAD/elements/)
- **OpenStreetMap (OSM):** Used for city street data and vehicle flow particle systems.
- **Public CCTV Feeds:** Geographically located and projected onto the 3D model (e.g., Austin traffic cameras).

### 3. AI & Automation:
- **LLMs:** Gemini 3.1 and Claude 4.6 (mentioned in the post as key tools for building the project).
- **AI Agents:** Used for data normalization, coordinate alignment, and real-time snapshotting of feeds.

### 4. Visual Effects:
- Night vision, FLIR thermal, and CRT scan line shaders applied to the 3D view to simulate a "spy satellite" interface.

## Open-Source Implementations & Clones:

### 1. OSINT-WorldView (amanimran786/osint-worldview)
- **Status:** Active, high-quality open-source alternative.
- **Key Features:**
    - **Dual-Engine Mapping:** globe.gl (3D) and deck.gl (flat).
    - **45 Data Layers:** Conflicts, satellites, markets, cyber threats, live flights (ADS-B), naval vessels (AIS).
    - **AI Integration:** 4-tier fallback chain (Local Ollama -> Groq -> OpenRouter -> Browser T5).
    - **Tech Stack:** Vite, React, TypeScript, Node.js, gRPC, Tauri (for desktop app).
    - **Data Sources:** 435+ RSS feeds, live APIs for ADS-B/AIS, public datasets.
- **Significance:** This project directly implements many of the features described by Bilawal Sidhu and provides a concrete codebase to study.

### 2. K-AI-STACK/WorldView
- **Status:** Browser-based geospatial intelligence dashboard.
- **Tech Stack:** CesiumJS.
- **Features:** Real-time data layers, multiple display modes, no backend required.

### 3. NASA Worldview (nasa-gibs/worldview)
- **Status:** Official NASA project.
- **Focus:** Browsing 1000+ global satellite imagery layers.
- **Significance:** Good reference for handling massive satellite data layers, though less focused on the "AI agent" and "command center" aspect.

### 4. Worldwideview (silvertakana/worldwideview)
- **Status:** Real-time geospatial engine.
- **Tech Stack:** 3D globe visualization with a plugin architecture for live global data.

## Community & Expert Analysis:

### 1. "Vibe-Coding" Palantir:
- **Concept:** Bilawal Sidhu used natural language prompts (vibe-coding) with advanced LLMs (Gemini 3.1, Claude 4.6) to generate the complex code for WorldView in a single weekend.
- **Palantir Response:** Palantir co-founder Joe Lonsdale responded, acknowledging the impressive nature of the demo but noting it lacks the proprietary, secure data integration that Palantir provides for governments.
- **Significance:** This highlights that the *frontend* and *public data integration* can now be built extremely fast by a single person using AI, even if the deep backend security and proprietary data remain a moat for companies like Palantir.

### 2. Technical Teardowns:
- **Architecture:** The system is described as an "AI agent swarm" that handles the heavy lifting of data engineering.
- **4D Reconstruction:** The project isn't just a 3D map; it's a 4D timeline. It uses AI to align timestamps from disparate sources (satellite passes, flight logs, social media feeds) into a single, scrubbable timeline.
- **Browser-Based:** The entire "command center" runs in a standard web browser, utilizing WebGL/WebGPU for high-performance 3D rendering.

### 3. Key Learning Resources:
- **Bilawal Sidhu's YouTube:** Contains deep dives into the "God's Eye View" projects, including the Iran strikes reconstruction and the "Spy Satellite Simulator."
- **SpatialIntelligence.ai:** The official Substack where he publishes technical breakdowns and the philosophy behind the project.
