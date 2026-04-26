# OpenWorldEye

**OPEN WORLD EYE** · Open geospatial OSINT globe: live aircraft (OpenSky), satellite positions from CelesTrak TLEs + `satellite.js`, USGS earthquakes, and sample conflict markers—rendered with **react-globe.gl** and a tactical command-deck UI (clock scrub, layer rail, intelligence panel).

| | |
| --- | --- |
| **Live demo** | Deploy on **Vercel** (see [Deploy with Vercel](#deploy-with-vercel)), then paste your production URL here, e.g. `https://openworldeye.vercel.app` |
| **Repository** | [github.com/chama-x/openworldeye](https://github.com/chama-x/openworldeye) |
| **Docs** | [docs/README.md](docs/README.md) · [Publish checklist](docs/PUBLISH_CHECKLIST.md) · [Branding](BRANDING.md) |

Hosting is **Vercel only** (static Vite build). Do not use GitHub Pages for this project.

## Quick start

```bash
npm install
npm run dev
```

- **Build:** `npm run build`
- **Preview build:** `npm run preview`

## Deploy with Vercel

1. Install the CLI: `npm i -g vercel`
2. From this directory (logged in: `vercel login`):

```bash
vercel link    # first time: link to a Vercel team/project
vercel         # preview deployment
vercel --prod  # production URL — put it in the table above + GitHub About → Website
```

3. **Environment variables** (Vercel → Project → Settings → Environment Variables), mirror [`.env.example`](.env.example): optional `VITE_GROQ_API_KEY`, `VITE_GROQ_MODEL`. Redeploy after changes.

4. **GitHub integration (recommended):** In Vercel, **Add New Project → Import** `chama-x/openworldeye`. Every push to `main` can auto-deploy previews/production per your Vercel settings.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fchama-x%2Fopenworldeye)

## Stack

- Vite 6 · React 19 · TypeScript
- Tailwind CSS v4 (`@tailwindcss/vite`)
- `react-globe.gl` / Three.js · `satellite.js` (SGP4)

## Environment variables

| Variable | Purpose |
| --- | --- |
| `VITE_GROQ_API_KEY` | Optional — enables **Synthesize** in the Intelligence panel (Groq OpenAI-compatible API). |
| `VITE_GROQ_MODEL` | Optional — defaults to `llama-3.1-8b-instant`. |

Copy [`.env.example`](.env.example) → `.env.local` for local dev. Use Vercel env UI for production.

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
  research/                # External WorldView reference material (not the product name)
vercel.json                # Vercel framework + build output
```

## Git clone

```bash
git clone https://github.com/chama-x/openworldeye.git
cd openworldeye
npm install
```

After first Vercel production deploy, complete **[docs/PUBLISH_CHECKLIST.md](docs/PUBLISH_CHECKLIST.md)** (GitHub About URL, topics, README live link).

## License

[MIT](LICENSE)
