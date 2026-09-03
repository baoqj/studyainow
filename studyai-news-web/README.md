# studyai-news-web

`studyai-news-web` is the reserved, version-controlled directory for the Cloudflare Worker that will serve `news.studyai.now`.

Current status: **repository boundary only; implementation has not started**.

## Ownership

This project will own:

- the public news site and content templates;
- the `/admin/news` editor UI;
- server-rendered public pages and edge caching;
- same-origin forwarding of `/api/news/v1/*` and `/api/admin/news/*` to the `studyai-news-api` Worker through a Cloudflare Service Binding;
- browser-only interaction such as search UI, theme, sharing and the podcast player.

This project will not own:

- D1 migrations or direct D1 writes;
- crawling, AI generation, TTS or publishing state machines;
- source snapshots or podcast binaries;
- StudyAINow user, skill, course or entitlement master data.

## Git boundary

- The only Git root is the parent repository at `studyainow/Code`.
- Do not run `git init` here and do not add a nested repository.
- Commit scope: `news-web`.
- Worker name: `studyai-news-web`.
- Production hostname: `news.studyai.now`.

## Planning source

- Product requirements: `../../PRD/News/`
- Approved execution plan: `../docs/news/CODEX_DEVELOPMENT_PLAN.zh-CN.md`

Implementation must wait for explicit plan approval.
