# Peni Pad

Turn any worksheet PDF into a touch-first, crayon-like activity for children aged 3 to 8.

Phase 1, "The Magic Crayon": offline-first PWA, local storage only, core ink plus PDF rendering. No backend, no accounts.

## Requirements

- Node 20.11+ (see `.nvmrc`)
- npm 10+

## Getting started

```bash
npm install
npm run dev
```

## Scripts

| Script                  | What it does                                           |
| ----------------------- | ------------------------------------------------------ |
| `npm run dev`           | Start the Vite dev server                              |
| `npm run build`         | Typecheck, then build the production bundle to `dist/` |
| `npm run preview`       | Preview the production build locally                   |
| `npm run typecheck`     | Run `tsc --noEmit`                                     |
| `npm run lint`          | Lint with ESLint                                       |
| `npm run format`        | Format with Prettier                                   |
| `npm run test`          | Run unit and integration tests once                    |
| `npm run test:watch`    | Run tests in watch mode                                |
| `npm run test:coverage` | Run tests with coverage                                |
| `npm run bench`         | Run benchmarks (ink-latency gate, wired in Step 2)     |

## Architecture boundaries

These are enforced, not just documented (see `CLAUDE.md` for the full standard):

- **`src/engine/` is framework-agnostic.** Zero React imports. ESLint blocks `react`, `react-dom`, `zustand`, and the UI store/hooks/components from this directory. The ink engine is hot-path code and must never route through a React render.
- **Ink is stored as normalized vectors** (`0.0` to `1.0` x/y), append-only per page. That is the system of record.
- **All IndexedDB access lives in `src/db/queries.ts`.** No raw Dexie calls elsewhere.
- **Two zones.** `src/components/child/` is icon-only and reachable by the child. `src/components/parent/` sits behind the parental gate.

## Directory layout

```
src/
  engine/      Ink engine (no React)
  pdf/         pdf.js wrapper, thumbnailing
  db/          Dexie schema and the single query boundary
  store/       Zustand UI/activity state (no ink state)
  components/  child / parent / shared
  hooks/       Thin React hooks; delegate to engine/db/store
  utils/       Pure functions
  types/       Shared types
  constants.ts Performance budgets, palette, sizes
bench/         Performance benchmarks (ink latency)
```

## Deployment

Web target is Cloudflare Pages.

- Build command: `npm run build`
- Output directory: `dist`
- `public/_redirects` provides the SPA fallback.

CI (`.github/workflows/ci.yml`) runs typecheck, lint, format check, tests, the bench gate, and build on every push and PR to `main`.
