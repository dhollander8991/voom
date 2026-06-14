# VOOM Drone News

A single-page drone-news reader: a TypeScript backend polls NewsAPI for drone coverage, caches it in SQLite, and serves it to a React + Mantine frontend with search and a Claude-generated author summary.

## Why this shape

NewsAPI's free tier has two hard constraints: **100 requests/day** and requests **only work from `localhost`**. You cannot call it directly from a deployed browser app, and you'd blow the daily quota in minutes if every page load hit it. So the backend owns all NewsAPI access: a poller fetches once on startup and then every 15 minutes (~96 calls/day, under the cap), normalizes and dedupes into SQLite, and the frontend reads from our own fast, unmetered API. Search and author lookups never touch NewsAPI at all.

```
node-cron poller ──> NewsAPI ──> normalize+dedupe ──> SQLite ──> Express ──> React + Mantine
                                                          ▲
                              author modal ──> Express ──> Claude (Anthropic API)
```

## Tech stack

| Layer | Choice | Why lean |
| --- | --- | --- |
| Monorepo | npm workspaces + `concurrently` | Built into npm. No NX/Turborepo daemon, config, or cache to babysit. |
| Backend | Express + TypeScript | Boring, well-understood HTTP. No framework magic. |
| Storage | better-sqlite3 | A single local file, synchronous API, zero server process. Perfect for a cache. |
| Data access | Drizzle ORM + drizzle-kit | Type-safe queries over better-sqlite3 with no separate engine. Readable query builder instead of hand-built SQL strings + manual placeholders; `schema.ts` is the single source of truth and drizzle-kit generates the migrations. |
| HTTP | native `fetch` | Built into Node 18+. No axios/got dependency. |
| Author summaries | Anthropic SDK (`@anthropic-ai/sdk`) | The official client for Claude — typed requests, retries, and error classes for free. Author bios come from `claude-haiku-4-5` with its server-side **web search** tool, so even lesser-known journalists are looked up and verified rather than answered from memory. No scraping or third-party API to maintain. |
| Scheduler | node-cron | One small dep for "run this every N minutes". |
| Frontend | Vite + React 19.2 | Instant dev server, fast builds. |
| UI | Mantine 9 | Batteries-included components (Card, Modal, Skeleton, hooks) so we write app code, not a design system. |
| Data fetching | TanStack Query (React Query) | Caching, request dedup, and loading/error state out of the box — no hand-rolled `useEffect` fetch plumbing. |
| Tests | Vitest + Supertest + Testing Library | One runner for both workspaces. Fast, ESM-native, v8 coverage built in. |

## Architecture

- **Poller** (`server/src/services/poller.ts`) — runs once immediately at startup so the DB is warm on the first request, then on a cron schedule. A failed poll is logged, never thrown; one bad fetch can't take the process down.
- **NewsApiClient** (`server/src/clients/newsApiClient.ts`) — hits `/v2/everything?q=drone OR drones`, normalizes each result into our `Article` shape, and derives a stable `id` by SHA-1 hashing the article URL.
- **Dependencies are factory functions, not classes.** `createArticleRepository`, `createNewsApiClient`, `createAuthorClient`, and `createNewsPoller` each take their dependencies and return a plain object — no `class`/`constructor`/`this`. Same dependency injection and testability, less ceremony.
- **AuthorClient** (`server/src/clients/authorClient.ts`) — `createAuthorClient({ apiKey })` wraps the Anthropic SDK. It gives Claude (`claude-haiku-4-5`) the server-side **web search** tool, asks it to look up and validate the byline, and to return a structured `{ found, summary }` JSON (structured outputs guarantee clean JSON — no markdown fences). When nothing is found the endpoint returns `200 { author: null }` (a valid result of a successful request, not a 404). Tests inject a stub Anthropic client, so no real API call is made.
- **ArticleRepository** (`server/src/repositories/articleRepository.ts`) — `createArticleRepository(db)` takes a Drizzle handle, so tests hand it an in-memory DB and it owns no connection lifecycle. Upserts dedupe on URL via `onConflictDoUpdate`; `findLatest` builds its case-insensitive multi-word AND filter with Drizzle's `and`/`or`/`like` helpers, ordered by publish date. The table is defined once in `server/src/schema.ts`, which also infers the row type.
- **Express app** (`server/src/app.ts`) — built from injected dependencies and free of process concerns (no `listen`, no DB opening), so Supertest can exercise it directly.
- **Frontend** — `App` owns a debounced search value that drives `useNews` (a thin `useQuery` wrapper keyed on the query, so repeat searches are served from cache and the grid doesn't flash on every keystroke). Clicking an author opens `AuthorModal`, whose `useAuthor` query is disabled until a name is set. Raw `fetch` access is isolated in `client/src/lib/api.ts`; React Query owns caching and request state on top of it.

## Prerequisites

- **Node 18+** (developed on Node 22). Native `fetch` and better-sqlite3 prebuilds need a modern Node.
- **React 19.2 / Mantine 9** — Mantine 9 requires React 19.2+. This is already pinned in `client/package.json`; just don't downgrade React.
- **A free NewsAPI key** — register at https://newsapi.org/register and copy the key (required).
- **An Anthropic API key** *(optional)* — only for the author-summary feature. Without it the app runs normally and the author endpoint returns no info. Create one at https://console.anthropic.com/settings/keys.

## Setup & run

```bash
# 1. Install everything (both workspaces) from the root
npm install

# 2. Configure the backend
cp server/.env.example server/.env
#   then edit server/.env and set NEWS_API_KEY=<your key> (required).
#   CLAUDE_API_KEY is optional — set it to enable author summaries.

# 3. (optional) Configure the frontend
cp client/.env.example client/.env
#   leave VITE_API_URL unset in dev — the Vite proxy forwards /api to :3001

# 4. Run both dev servers (Express on :3001, Vite on :5173)
npm run dev
```

Open http://localhost:5173. The first poll runs at startup, so news appears within a few seconds.

Other root scripts:

```bash
npm run build   # typecheck + build both workspaces
npm test        # run both test suites
npm run lint    # typecheck both workspaces
```

## API reference

Base URL in dev: `http://localhost:3001`. The Vite dev server proxies `/api/*` here.

### `GET /api/news`

One page of cached articles, newest first.

| Param | Type | Default | Notes |
| --- | --- | --- | --- |
| `q` | string | — | Optional. Space-separated keywords, AND-combined, case-insensitive across title/description/content. |
| `page` | number | 1 | 1-based. Clamped to ≥ 1. |
| `pageSize` | number | 12 | Items per page. Capped at 100. |
| `sort` | `newest` \| `oldest` | `newest` | Order by publish date. |

Returns the page plus pagination metadata. `total` is the count of all matching articles (not just this page), so the client can render page controls.

```json
{
  "total": 188,
  "page": 1,
  "pageSize": 12,
  "totalPages": 16,
  "articles": [
    {
      "id": "b87376603b46a9195c2981eedc0db1de900d8b67",
      "title": "Ukrainian drones strike Sevastopol museum and key Russian oil refineries",
      "description": "The multiday campaign has killed a rail worker...",
      "content": "Ukrainian drones have struck a historic museum... [+2919 chars]",
      "url": "https://www.aljazeera.com/news/2026/6/10/ukrainian-drones-strike-...",
      "imageUrl": "https://www.aljazeera.com/wp-content/uploads/2026/06/reuters_...jpg",
      "sourceName": "Al Jazeera English",
      "author": "Al Jazeera Staff",
      "publishedAt": "2026-06-10T07:22:22Z"
    }
  ]
}
```

### `GET /api/authors`

A Claude-generated summary of the author (`claude-haiku-4-5`), grounded in a live web-search lookup. Expect ~2-5s latency since Claude searches the web before answering.

| Param | Type | Notes |
| --- | --- | --- |
| `name` | string | Required. 400 if missing. |

Always `200` on a well-formed request. The author is wrapped in an envelope; `author` is `null` when nothing was found.

```json
{
  "author": {
    "name": "Elon Musk",
    "summary": "Elon Musk is a business magnate and entrepreneur known for founding and leading several high-profile technology companies. He is the CEO of Tesla and the founder and CEO of SpaceX..."
  }
}
```

`200 { "author": null }` when search turns up no usable info — a made-up name, a generic label like "Staff"/"Editorial Team", or a clearly non-news entity. (A byline can be an individual *or* a known news organization like "ABC News" or "Reuters".) `400 { "message": ... }` only when `name` is missing.

### `GET /api/health`

```json
{ "status": "ok" }
```

## Persistence & deduping

Articles live in one SQLite table (`articles`) at `server/data/news.db` (configurable via `DATABASE_PATH`). The `url` column is `UNIQUE`, and the `id` is a SHA-1 of that URL, so the same article always maps to the same row. `upsertMany` issues a Drizzle `insert(...).onConflictDoUpdate({ target: url })`, so re-polling refreshes existing rows in place instead of creating duplicates (the `id` is never overwritten, keeping each article's stable handle). Search uses `LIKE` over title/description/content, ordered by `published_at DESC`, with an index on `published_at`.

The schema is defined once as a typed Drizzle table in `server/src/schema.ts`. `drizzle-kit generate` turns that into SQL migrations under `server/drizzle/`, and `openDatabase` (`db.ts`) applies them on startup via Drizzle's migrator — so opening the database always brings the schema up to date, including the in-memory databases used in tests. If you change `schema.ts`, run `npm run db:generate --workspace=server` to produce a new migration.

## Bonuses implemented

- **Page enhancements** — debounced live search with a clear button, sort (newest/oldest), pagination, **shareable deep links** (the search/page/sort live in the URL query string, so a filtered view can be copied and shared), clickable cards (hover lift + open article), an author modal, responsive 1/2/3-column grid, image fallback so a null image never breaks layout, relative timestamps ("3h ago"), and full loading/empty/error states with retry.
- **Claude author endpoint + modal** — click an author to open a modal with a short Claude-generated summary of who they are; when Claude has no reliable information the modal shows an empty/"no info" state.
- **Unit tests on both sides** — see below.

## Testing

```bash
npm test                                   # both suites from the root
npm run test --workspace=server            # backend only
npm run test --workspace=client            # frontend only
npm run test:watch --workspace=server      # watch mode
npm run test:coverage --workspace=client   # v8 coverage report
```

Coverage uses Vitest's v8 provider in both workspaces; the text summary prints to the console and a browsable HTML report is written to `coverage/`.

**Backend** (Vitest + Supertest) — deterministic and isolated: the repository runs against an in-memory SQLite (`:memory:`), the NewsAPI client takes an injectable `fetch`, and the author client takes an injectable Anthropic client. No real network, no real disk, no real Claude call. Covers repository upsert/dedupe/search/limit, NewsAPI normalization and error handling, the author client's found/not-found/blank/malformed-JSON branches, and every endpoint via Supertest.

**Frontend** (Vitest + jsdom + Testing Library + user-event) — `src/lib/api.ts` is mocked with `vi.mock`, so tests never hit the network. Covers `NewsCard` (including null author/image), the feed's loading→articles→empty→error states, debounced search refetch, and the author modal's loading/success/no-info states.

> **Mantine in jsdom:** jsdom implements neither `window.matchMedia` nor `ResizeObserver`, both of which Mantine uses internally. `client/src/test/setup.ts` stubs them, and `client/src/test/render.tsx` exports a custom `render()` that wraps components in `<MantineProvider>` plus a fresh `<QueryClientProvider>` (with retries off, so rejected queries surface the error state immediately). **Use that `render`, not Testing Library's bare one**, or Mantine components throw for lack of a provider and the React Query hooks throw for lack of a client.

## Project structure

```
voom/
├── package.json              # workspaces + dev/build/test/lint scripts
├── shared/                   # @voom/shared — API-contract types (single source)
│   └── index.ts              # Article, AuthorInfo, SortOrder, PaginatedArticles
├── client/                   # Vite + React 19.2 + Mantine 9
│   ├── postcss.config.cjs    # postcss-preset-mantine + breakpoint vars
│   ├── vite.config.ts        # dev proxy /api -> :3001, vitest config
│   └── src/
│       ├── main.tsx          # MantineProvider + theme
│       ├── App.tsx           # page: search -> feed, author modal
│       ├── lib/api.ts        # generic apiQuery<T>
│       ├── queries/          # news.queries (useNews/useAuthor) + news.constants (keys)
│       ├── components/       # Header, NewsCard, AuthorModal, states (+ .module.css)
│       └── test/             # setup (matchMedia/ResizeObserver), custom render
└── server/                   # Express + TypeScript
    ├── .env.example
    ├── drizzle.config.ts     # drizzle-kit config (schema -> migrations)
    ├── drizzle/              # generated SQL migrations (committed)
    └── src/
        ├── index.ts          # wires deps, starts poller + server
        ├── app.ts            # Express app from injected deps
        ├── db.ts             # open connection + run Drizzle migrations
        ├── schema.ts         # typed Drizzle table (single source of truth)
        ├── config.ts         # env loading/validation
        ├── clients/          # createNewsApiClient, createAuthorClient (Claude)
        ├── repositories/     # createArticleRepository
        ├── routes/           # news, authors, health
        └── services/         # createNewsPoller (node-cron)
```

## Limitations

- **NewsAPI free tier is localhost-only and 100 req/day.** This app is built to run locally; a real deployment needs a paid NewsAPI plan (or a different source). The 15-minute poll interval is tuned for the free quota.
- **Freshness lags by up to the poll interval.** News is at most ~15 minutes stale by design — that's the trade for staying under the rate limit. At 15 min the poller makes ~96 calls/day, which leaves only ~4 requests of headroom under the 100/day cap, so frequent restarts (each does an immediate poll) could push you over; raise `POLL_INTERVAL_MINUTES` if that's a concern.
- **Author summaries use live web search.** Claude searches the web to look up and verify the byline, so even lesser-known journalists get a summary (not just names already in the model's training data). A byline can be an individual (journalist, writer, public figure) or a known news organization. Only generic, non-identifying labels ("Staff", "Editorial Team", "Correspondent"), clearly non-news entities, or bylines search can't verify resolve to `author: null` (HTTP 200), which the modal renders as its empty state. Trade-offs: each lookup makes a (billable) web search and adds ~2-5s latency, and summaries carry the usual LLM/search caveats — tune `MAX_WEB_SEARCHES` in `authorClient.ts` or drop the tool to revert to memory-only.
```

