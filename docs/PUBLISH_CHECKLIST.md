# Publish checklist (GitHub + Vercel)

OpenWorldEye is deployed with **Vercel** only (`vercel.json` + Vite static `dist/`). If GitHub Pages was enabled earlier, turn it off under **Repository → Settings → Pages** so traffic is not split.

## Vercel (required)

1. **Import the repo** in [Vercel](https://vercel.com/new): select `chama-x/openworldeye`, framework **Vite**, root `.`, build `npm run build`, output `dist` (usually auto-detected).
2. Or use the CLI from the project root:
   ```bash
   npm i -g vercel
   vercel login
   vercel link
   vercel          # preview — note the *.vercel.app URL
   vercel --prod   # production
   ```
3. **Environment variables:** Project → Settings → Environment Variables — add optional `VITE_GROQ_API_KEY` / `VITE_GROQ_MODEL` for the Intelligence panel. Redeploy after edits.
4. **Production URL** (this project): [https://openworldeye.vercel.app/](https://openworldeye.vercel.app/) — keep GitHub **About → Website** and the root `README.md` live-demo row in sync when the alias changes.

## GitHub repository

1. **Topics:** Repo → About (gear) → add e.g. `osint`, `geospatial`, `react`, `vite`, `threejs`, `globe`, `vercel`, `opensky`, `usgs`, `celestrak`, `typescript`.
2. **Releases (optional):**
   ```bash
   git tag -a v0.1.0 -m "Release notes summary"
   git push origin v0.1.0
   ```
   Then **Releases → Draft a new release** from that tag.

## Smoke test on Vercel

- Globe loads (earth textures from `unpkg` must not be blocked).
- OpenSky/USGS: if blocked, sample fallbacks should still show points.
- Groq synthesis only if env vars are set for the deployment environment (Production / Preview).
