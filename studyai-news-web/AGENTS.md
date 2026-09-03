# Codex instructions: studyai-news-web

These instructions apply only to this directory.

- Do not start implementation until the user approves `../docs/news/CODEX_DEVELOPMENT_PLAN.zh-CN.md`.
- Preserve the exact Cloudflare Worker name `studyai-news-web` and hostname `news.studyai.now`.
- Keep this project inside the parent `studyainow/Code` Git repository. Never create a nested `.git` directory.
- Own public pages and the `/admin/news` UI here. Business state, ingestion, AI jobs, D1 migrations and media persistence belong to `../studyai-news-api`.
- Do not bind this Worker directly to the News D1, R2, Vectorize or Queues. Reach the API Worker through the `NEWS_API` Service Binding.
- Public article content must be available in initial HTML. Client-only rendering is not acceptable for article, daily, category, tag, correction or podcast-transcript content.
- Treat `/api/news/v1/*` and `/api/admin/news/*` as contract paths. Do not duplicate API domain models by hand when generated contract types are available.
- Include loading, empty, error, 404 and unauthorized states. Verify desktop and 390 px mobile layouts before reporting UI work complete.
- Never commit `.dev.vars`, credentials, build output, Wrangler state, downloaded source pages or generated media.
- Limit cross-boundary edits to the explicitly approved ticket; report any required change outside this directory before making it.
