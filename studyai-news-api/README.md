# studyai-news-api

Cloudflare Worker backend for StudyAI News.

P0-0 status: API foundation with a versioned health endpoint and OpenAPI contract. News schema, ingestion and editorial business logic begin in P0-1 and later milestones.

## Boundary

This project owns:

- `/api/news/v1/*` public APIs;
- `/api/admin/news/*` editorial APIs;
- future News D1 migrations, source ingestion, Claim Ledger, workflow, audit and media state;
- the API contract in `openapi/news-api.yaml`.

It does not own public page rendering or StudyAINow user, organization, skill, course and entitlement master data. It must never write directly to `studyainow-db`.

The only Git root is the parent repository at `studyainow/Code`. Do not initialize a nested repository.

## Runtime names

| Environment | Worker |
|---|---|
| Development | `studyai-news-api-dev` |
| Staging | `studyai-news-api-staging` |
| Production | `studyai-news-api` |

The production Worker is intentionally private and is called by `studyai-news-web` through the `NEWS_API` Service Binding.

## Commands

```bash
npm install
npm run dev
npm run typecheck
npm test
npm run contract:check
npm run check
npm run deploy:staging
npm run deploy
```

`npm run deploy` always runs the full local check and a production dry-run before deploying.

## Current endpoints

- `GET /api/news/v1/health`

Product requirements remain in `../../PRD/News/`. The approved execution plan is `../docs/news/CODEX_DEVELOPMENT_PLAN.zh-CN.md`.
