# OpenWorldEye

Real-time geospatial fusion engine on an interactive WebGL globe tracking satellite orbits, live air traffic, and seismic activity.

![OpenWorldEye Live Demo](docs/assets/openworldeye-demo.gif)

---

## Problem

Open-source geospatial intelligence is fragmented across disparate radar tracking APIs, orbital element catalogues, and geological feeds with varying coordinate systems and update rates. Rendering hundreds of heterogeneous moving entities concurrently in the browser often causes severe frame drops and high memory pressure. OpenWorldEye unifies live ADS-B flight feeds, SGP4 orbital propagation, and seismic monitoring onto a single hardware-accelerated 3D globe with client-side caching and fallback resilience.

---

## Architecture

- **Orbital Propagation Engine:** SGP4/TLE satellite propagation in real-time via `satellite.js` with browser-level element caching.
- **Flight & ADS-B Pipeline:** Live air traffic tracking via ADSB.fi Open Data with rate-limit dampening and coordinate interpolation.
- **Seismic & Geospatial Feeds:** Real-time USGS earthquake feeds and tactical conflict telemetry.
- **Hardware-Accelerated Visualization:** WebGL globe rendering powered by `react-globe.gl` and Three.js with level-of-detail model management.
- **Resilient Fallback Layer:** Deterministic offline simulations and cached state transitions to guarantee continuous visualization under API rate limits.

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/chama-x/openworldeye.git
cd openworldeye

# Install dependencies
npm install

# Configure environment variables (optional)
cp .env.example .env.local

# Run the development server
npm run dev
# Open http://localhost:5173
```

---

## What I'd Explore Next

- High-density point cloud visualizer for space debris tracking.
- WebGPU compute shaders for client-side batch SGP4 propagation of 10,000+ orbital objects.
- Real-time ADS-B multilateration time-difference-of-arrival (TDOA) solver in WebAssembly.

---

## License

[MIT](LICENSE)
