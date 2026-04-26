# OpenWorldEye

**OPEN WORLD EYE** · Open geospatial OSINT globe: live aircraft (OpenSky), satellite positions from CelesTrak TLEs + `satellite.js`, USGS earthquakes, and sample conflict markers—rendered with **react-globe.gl** and a tactical command-deck UI (clock scrub, layer rail, intelligence panel).

| | |
| --- | --- |
| **Live demo** | **GitHub Pages:** [https://chama-x.github.io/openworldeye/](https://chama-x.github.io/openworldeye/) (after the first workflow run finishes, enable *Pages → gh-pages* if the site is 404 — see checklist). |
| **Repository** | [github.com/chama-x/openworldeye](https://github.com/chama-x/openworldeye) |
| **Docs** | [docs/README.md](docs/README.md) · [Publish checklist](docs/PUBLISH_CHECKLIST.md) · [Branding](BRANDING.md) |

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fchama-x%2Fopenworldeye)

*(Optional: clone into Vercel for previews; primary static hosting uses GitHub Actions → `gh-pages`.)*

## Quick start

```bash
npm install
npm run dev
```

- **Build:** `npm run build`
- **Preview build:** `npm run preview`

## Stack

- Vite 6 · React 19 · TypeScript
- Tailwind CSS v4 (`@tailwindcss/vite`)
- `react-globe.gl` / Three.js · `satellite.js` (SGP4)

## Environment variables

| Variable | Purpose |
| --- | --- |
| `VITE_GROQ_API_KEY` | Optional — enables **Synthesize** in the Intelligence panel (Groq OpenAI-compatible API). |
| `VITE_GROQ_MODEL` | Optional — defaults to `llama-3.1-8b-instant`. |

Copy [`.env.example`](.env.example) → `.env.local`. On Vercel, set the same keys under **Project → Settings → Environment Variables**.

## CORS and networks

All feeds use browser `fetch()`. Corporate networks or blockers may break OpenSky/USGS; the app falls back to sample data where implemented in `src/lib/osint-services.ts`.

## Project layout

```
src/
  CommandDeck.tsx          # Shell: header, rails, globe, intelligence, timeline
  components/              # Globe, timeline scrubber, intelligence brief
  contexts/                # Global clock, data layers, shared OSINT snapshot
  hooks/                   # Polling hooks (free-tier aware)
  lib/osint-services.ts    # API + propagation
docs/
  design-brief.md          # UI / tactical direction
  research/                # External WorldView reference material (not our product name)
```

## GitHub

```bash
git init
git add .
git commit -m "chore: initial OpenWorldEye release"
git remote add origin https://github.com/chama-x/openworldeye.git
git branch -M main
git push -u origin main
```

Then complete **[docs/PUBLISH_CHECKLIST.md](docs/PUBLISH_CHECKLIST.md)** (topics/tags, Vercel CLI, paste production URL into About + README).

## License

[MIT](LICENSE)
