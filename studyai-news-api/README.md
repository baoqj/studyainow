# studyai-news-api

Cloudflare Worker backend for StudyAI News.

P0-4 status: the independent News D1 schema includes approved-source ingestion,
deterministic cross-source clustering, controlled categories/tags/entities, immutable
Research Packages, Claim/evidence revisions, fact-coverage gates, article revisions,
human approval gates, publication events and audit logs.

## Boundary

This project owns:

- `/api/news/v1/*` public APIs;
- `/api/admin/news/*` editorial APIs;
- future News D1 migrations, source ingestion, Claim Ledger, workflow, audit and media state;
- the API contract in `openapi/news-api.yaml`.

It does not own public page rendering or StudyAINow user, organization, skill, course and entitlement master data. It must never write directly to `studyainow-db`.

The only Git root is the parent repository at `studyainow/Code`. Do not initialize a nested repository.

## Runtime names

| Environment | Worker | D1 | Private R2 |
|---|---|---|---|
| Development | `studyai-news-api-dev` | local persistence for `studyai-news-db-staging` | local persistence for `studyai-news-media-staging` |
| Staging | `studyai-news-api-staging` | `studyai-news-db-staging` | `studyai-news-media-staging` |
| Production | `studyai-news-api` | `studyai-news-db` | `studyai-news-media` |

The production Worker is intentionally private. Public requests are called by
`studyai-news-web`; administration is called only by the authenticated
`studyainow-web` proxy, both through separate `NEWS_API` Service Bindings.

## Commands

```bash
npm install
npm run db:migrate:local
npm run dev
npm run db:verify
npm run typecheck
npm test
npm run contract:check
npm run check
npm run deploy:staging
npm run deploy
```

`npm run deploy:staging` and `npm run deploy` always run the full local check, apply pending migrations to the matching remote D1, and only then deploy the Worker. Released migration files are append-only and must not be edited in place.

The staging and production environments run the ingestion scheduler every 15 minutes.
Each scheduled invocation claims no more than two due sources; each source has its
own minimum polling interval and processes at most 20 current feed entries. Newly
normalized candidates are then clustered and enriched with the versioned ruleset.

Configure the bootstrap operator credential as a Worker secret; never store it in
`.dev.vars`, shell history or Git:

```bash
npx wrangler secret put INGEST_ADMIN_TOKEN --env staging
npx wrangler secret put INGEST_ADMIN_TOKEN --env production
```

The operational credential must contain at least 32 characters and is never accepted by
the browser UI. The sole UI at `studyai.now/admin/news` uses the existing main-site
administrator session. Its Worker verifies the `admin` role and same-origin mutation,
then calls this API with `STUDYAI_ADMIN_SERVICE_TOKEN` and a validated audit actor. The
browser session and service credential are never forwarded to the other side.

The health endpoint returns HTTP 503 until the bound database reports the expected schema version. This prevents application code from being treated as healthy before its migration is present.

## Ingestion boundary

- Only active sources whose policy and robots reviews are approved are scheduled.
- Fetch targets are HTTPS-only exact-host allowlists. IP literals, private/runtime
  service names, credentials and non-standard ports are rejected; each redirect is
  independently checked. Cloudflare's `global_fetch_strictly_public` runtime flag
  also blocks DNS-resolved private targets.
- Requests use an honest `StudyAI-NewsBot` user agent, conditional HTTP validators,
  a 10-second timeout and a 1 MiB streamed response ceiling.
- Feed snapshots are stored only in private R2 and registered as `restricted` in D1.
  Public APIs do not expose third-party feed bodies or full text. The `source-feed/`
  prefix expires after 90 days in both remote buckets while the audit metadata remains.
- Parser versions are recorded on source items, fetch runs and cursors. A parser upgrade
  can rebuild normalized D1 fields from one fresh fetch while reusing the immutable R2
  snapshot instead of storing a duplicate third-party payload.
- HTTP 429/5xx and parser/network failures are isolated per source and retried with
  bounded exponential backoff; `Retry-After` is honored up to 24 hours.
- The approved source list and live-probe evidence are recorded in
  [`../docs/news/P0-2_SOURCE_AUDIT.zh-CN.md`](../docs/news/P0-2_SOURCE_AUDIT.zh-CN.md).

## Schema rollback

News migrations do not modify StudyAINow Core data. They are additive and intentionally have no destructive down migration. If the Worker release must be rolled back, deploy the prior Worker version and leave the new tables in place; follow-up schema changes must use a new forward migration. Before any later migration that changes production data, create and verify a D1 export or Time Travel recovery point. R2 source snapshots are private operational evidence and are not removed by a Worker rollback.

## Current endpoints

- `GET /api/news/v1/health`
- `GET /api/admin/news/sources`
- `POST /api/admin/news/sources/probe`
- `POST /api/admin/news/sources`
- `PATCH /api/admin/news/sources/{sourceId}`
- `DELETE /api/admin/news/sources/{sourceId}`
- `POST /api/admin/news/sources/{sourceId}/run` (requires `Idempotency-Key`)
- `GET /api/admin/news/dashboard`
- `GET /api/admin/news/candidates`
- `POST /api/admin/news/candidates/enrich`
- `PATCH /api/admin/news/candidates/{storyId}`
- `GET /api/admin/news/stories/{storyId}`
- `POST /api/admin/news/stories/{storyId}/research`
- `POST /api/admin/news/stories/{storyId}/claims`
- `PATCH /api/admin/news/claims/{claimId}`
- `POST /api/admin/news/claims/{claimId}/evidence`
- `GET|POST /api/admin/news/articles`
- `GET|PATCH /api/admin/news/articles/{articleId}`
- `POST /api/admin/news/articles/{articleId}/actions/{action}`
- `GET /api/admin/news/taxonomy`
- `POST /api/admin/news/taxonomy/tags`
- `PATCH /api/admin/news/taxonomy/{taxonomyId}`
- `POST /api/admin/news/taxonomy/{taxonomyId}/merge`

All `/api/admin/news/*` endpoints require the main-site service identity or the
non-browser operational bearer credential. Newly
created sources remain paused with `review_required`; an operator must separately record
robots/policy approval before the scheduler can run them. Primary categories are seeded
as a locked set of eight; automated enrichment cannot create a ninth category or
overwrite human-locked story metadata.

Product requirements remain in `../../PRD/News/`. The approved execution plan is `../docs/news/CODEX_DEVELOPMENT_PLAN.zh-CN.md`.
