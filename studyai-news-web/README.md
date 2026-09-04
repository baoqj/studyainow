# studyai-news-web

Cloudflare Worker frontend for `news.studyai.now`.

P0-4 status: Astro foundation, server-rendered public shell and public API forwarding.
The former standalone News admin has been retired; all administration now lives inside
the existing `studyai.now/admin/news` control panel.

## Boundary

This project owns:

- public News page rendering;
- initial HTML, metadata and edge-facing responses;
- browser interaction;
- forwarding only `/api/news/v1/*` to `studyai-news-api`;
- permanent redirects from former `/admin/news*` URLs to the unified main admin.

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
- `GET /admin/news*` — `308` redirect to `https://studyai.now/admin/news*`
- `ALL /api/news/v1/*` — forwarded to the API Worker
- `ALL /api/admin/news/*` — rejected with `404`; the public hostname is not an admin boundary

Product requirements remain in `../../PRD/News/`. The approved execution plan is `../docs/news/CODEX_DEVELOPMENT_PLAN.zh-CN.md`.
