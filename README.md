# Stackhunt

Match jobs to the repos you already ship.

Drop in local project folders (or paste a public GitHub URL). Stackhunt reads manifests and READMEs **in the browser**, infers your stack, then searches public job boards. Remote roles skip commute; in-person and hybrid searches require an address from autocomplete and only keep on-site jobs within your drive radius.

## Features

- Drag-and-drop folders or add a GitHub repo
- Remote, in-person, or both
- Ranked results from JSearch (Google for Jobs: LinkedIn, Indeed, and others), The Muse, Arbeitnow, Greenhouse career pages, Remotive, and Jobicy
- First page loads ~40 listings; **Load more** appears only when another full page is available
- Google Places autocomplete (pick a suggestion — typed text alone is not used)
- Drive miles and minutes via Geocoding + Routes; jobs outside the radius or with no routable location are dropped
- Inferred stack persisted in `localStorage`

Source stays on your machine. Search keywords, location, and filters go to job APIs. Address lookup and commute run through the Express server with `GOOGLE_API_KEY` (the key is not exposed to the browser).

## Stack

Vite, React 18, TypeScript, Tailwind CSS, [shadcn/ui](https://ui.shadcn.com/), Express.

## Setup

```bash
pnpm install
cp .env.example .env
pnpm dev
```

App: [http://localhost:5173](http://localhost:5173)  
API: [http://127.0.0.1:3001](http://127.0.0.1:3001) (proxied as `/api` in development)

### Environment

| Variable | Required | Purpose |
| --- | --- | --- |
| `RAPIDAPI_KEY` | No | [JSearch](https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch) key. Without it, LinkedIn/Indeed via Google for Jobs are skipped. |
| `GOOGLE_API_KEY` | Yes for in-person | Places API (New), Geocoding API, and Routes API. Address autocomplete uses Places; commute uses Geocoding (job cities) and Routes (drive times). |
| `PORT` | No | API port, defaults to `3001`. |

Enable those three Google APIs on the key and restrict the key to them. Autocomplete suggestions are capped at five.

JSearch queries stay short (`React developer jobs in remote`) so Google for Jobs returns results. The full inferred stack is used only for ranking.

Probe JSearch without the UI:

```bash
pnpm test:jsearch
pnpm test:jsearch -- "react developer jobs in remote"
```

## Scripts

| Command | |
| --- | --- |
| `pnpm dev` | Vite + API together |
| `pnpm build` | Typecheck and production frontend build |
| `pnpm start` | Serve the API (and `dist/` in production) |
| `pnpm test:jsearch` | Hit JSearch `/search-v2` and print publishers |

## License

Private unless you add one.
