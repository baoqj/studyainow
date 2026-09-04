# studyai-news-web

Cloudflare Worker frontend for `news.studyai.now`.

P0-3 status: Astro/React foundation, server-rendered operational page, same-origin API
forwarding, and the `/admin/news` editorial console. Administrators can review clustered
candidates, lock categories/tags, create and revise articles, approve, publish, correct,
withdraw and reopen content, and maintain the controlled taxonomy.

## Boundary

This project owns:

- public and future `/admin/news` page rendering;
- initial HTML, metadata and edge-facing responses;
- browser interaction;
- forwarding `/api/news/v1/*` and `/api/admin/news/*` to `studyai-news-api`.

It does not own News D1 migrations, crawling, AI/TTS workflows, publication state or StudyAINow master data. It has no direct D1, R2, Queue, Workflow or Vectorize binding.

The only Git root is the parent repository at `studyainow/Code`. Do not initialize a nested repository.

## Runtime names

| Environment | Worker |
|---|---|
| Development | `studyai-news-web-dev` |
| Staging | `studyai-news-web-staging` |
| Production | `studyai-news-web` |

Production uses the custom domain `news.studyai.now`.

## Commands

```bash
npm install
npm run dev
npm run typecheck
npm test
npm run build
npm run check
npm run deploy:staging
npm run deploy
```

`npm run deploy` always runs the full local check and a production dry-run before deploying.

## Current routes

- `GET /` — server-rendered foundation status
- `GET /admin/news` — editorial dashboard
- `GET /admin/news/candidates` — clustered candidate inbox
- `GET /admin/news/articles` and `/admin/news/articles/{id}` — article list/editor
- `GET /admin/news/taxonomy` — category and tag management
- `ALL /api/news/v1/*` — forwarded to the API Worker
- `ALL /api/admin/news/*` — authenticated editorial API forwarding boundary

Product requirements remain in `../../PRD/News/`. The approved execution plan is `../docs/news/CODEX_DEVELOPMENT_PLAN.zh-CN.md`.
