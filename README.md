# Stackhunt

Match jobs to the repos you already ship.

Drop in local project folders (or paste a public GitHub URL). Stackhunt reads manifests and READMEs **in the browser**, infers your stack, then searches public job boards. Remote roles skip commute; in-person and hybrid searches require an address and show estimated drive distance.

## Features

- Drag-and-drop folders or add a GitHub repo
- Remote, in-person, or both (address required when listings are not remote)
- Ranked results from JSearch (Google for Jobs: LinkedIn, Indeed, and others), The Muse, Arbeitnow, Greenhouse career pages, Remotive, and Jobicy
- Filter by job board; search by title, company, or board
- First 40 results, then load more
- Inferred stack persisted in `localStorage`

Source stays on your machine. Only search keywords, location, and filters go to job APIs.

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
| `ADZUNA_APP_ID` / `ADZUNA_APP_KEY` | No | Extra aggregated listings. |
| `ADZUNA_COUNTRY` | No | Defaults to `us`. |
| `PORT` | No | API port, defaults to `3001`. |

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
