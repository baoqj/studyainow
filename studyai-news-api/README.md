# studyai-news-api

Cloudflare Worker backend for StudyAI News.

P0-1 status: independent News D1 schema and human-gated article publication state machine. Ingestion and editorial HTTP APIs begin in P0-2 and later milestones.

## Boundary

This project owns:

- `/api/news/v1/*` public APIs;
- `/api/admin/news/*` editorial APIs;
- future News D1 migrations, source ingestion, Claim Ledger, workflow, audit and media state;
- the API contract in `openapi/news-api.yaml`.

It does not own public page rendering or StudyAINow user, organization, skill, course and entitlement master data. It must never write directly to `studyainow-db`.

The only Git root is the parent repository at `studyainow/Code`. Do not initialize a nested repository.

## Runtime names

| Environment | Worker | D1 |
|---|---|---|
| Development | `studyai-news-api-dev` | local persistence for `studyai-news-db-staging` |
| Staging | `studyai-news-api-staging` | `studyai-news-db-staging` |
| Production | `studyai-news-api` | `studyai-news-db` |

The production Worker is intentionally private and is called by `studyai-news-web` through the `NEWS_API` Service Binding.

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

The health endpoint returns HTTP 503 until the bound database reports the expected schema version. This prevents application code from being treated as healthy before its migration is present.

## Schema rollback

P0-1 migrations create new, empty News-only databases and do not modify StudyAINow Core data. They are additive and intentionally have no destructive down migration. If the Worker release must be rolled back, deploy the prior Worker version and leave the new tables in place; follow-up schema changes must use a new forward migration. Before any later migration that changes production data, create and verify a D1 export or Time Travel recovery point.

## Current endpoints

- `GET /api/news/v1/health`

Product requirements remain in `../../PRD/News/`. The approved execution plan is `../docs/news/CODEX_DEVELOPMENT_PLAN.zh-CN.md`.
