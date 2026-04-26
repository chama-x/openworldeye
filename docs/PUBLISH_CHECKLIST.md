# Publish checklist (GitHub + Vercel)

Use this after the codebase is pushed to GitHub and you want a clean public footprint.

## GitHub repository

1. **Replace placeholders** in [`package.json`](../package.json) (`repository.url`) and in [`README.md`](../README.md) (Vercel “Deploy” button `repository-url`, live-demo table) with your real GitHub username and repo name.
2. **Create the repo** (empty, no README) on GitHub if you have not already.
3. **Push** from your machine:
   ```bash
   git remote add origin https://github.com/<you>/<repo>.git
   git branch -M main
   git push -u origin main
   ```
4. **Repository details** (Settings → General):
   - **Description:** e.g. `OpenWorldEye — OSINT globe: flights, satellites, quakes, events (react-globe.gl).`
   - **Website:** paste your **Vercel production URL** once it exists (step below).
5. **Topics (tags):** on the repo main page, click the gear next to “About” → **Topics**, then add labels such as:
   - `osint`, `geospatial`, `react`, `vite`, `threejs`, `globe`, `opensky`, `usgs`, `celestrak`, `typescript`, `vercel`
6. **Releases (optional):** Tags like `v0.1.0` help others pin versions:
   ```bash
   git tag -a v0.1.0 -m "Initial public command deck"
   git push origin v0.1.0
   ```
   Then on GitHub: **Releases → Draft a new release** from that tag, paste changelog bullets.

## Vercel (live preview + production)

1. Install the CLI (once): `npm i -g vercel`
2. From the project root:
   ```bash
   vercel login
   vercel link        # follow prompts; creates .vercel/ (gitignored here)
   vercel             # preview deployment — copy the https://*.vercel.app URL
   vercel --prod      # production alias
   ```
3. **Environment variables** in the Vercel dashboard (Project → Settings → Environment Variables), mirror `.env.example`:
   - `VITE_GROQ_API_KEY` (optional, for Intelligence “Synthesize”)
   - `VITE_GROQ_MODEL` (optional)
4. **Redeploy** after changing env vars: Deployments → … → Redeploy.
5. **Paste the production URL** back into:
   - GitHub **About → Website**
   - Your `README.md` (add a “Live demo” line with the link — replace the placeholder there)

## README hygiene

- Replace placeholder `https://github.com/<you>/<repo>` in the root `README.md` with your real repo URL.
- Replace `https://your-app.vercel.app` with your real Vercel production URL once deployed.

## Smoke test on production

- Globe loads (earth texture from `unpkg` must not be blocked).
- OpenSky/USGS: if blocked by browser or network, sample fallbacks should still show points.
- Optional Groq: only works if the key is set in Vercel env for **Production** (and Preview if you want previews to use it).
