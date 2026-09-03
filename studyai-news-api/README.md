# studyai-news-api

`studyai-news-api` is the reserved, version-controlled directory for the Cloudflare Worker that will provide the News API, editorial workflow and asynchronous content pipeline.

Current status: **repository boundary only; implementation has not started**.

## Ownership

This project will own:

- `/api/news/v1/*` public APIs;
- `/api/admin/news/*` editorial APIs;
- News D1 migrations and domain data;
- source discovery, compliant fetching, normalization, clustering and Claim Ledger records;
- classification, skill/course link suggestions and AI run provenance;
- Cloudflare Queues and Workflows orchestration;
- R2 media/source-snapshot metadata, podcast generation and publication state;
- audit logs, idempotency records, monitoring and release checks.

This project will not own:

- public page rendering or the editor UI;
- StudyAINow user, organization, skill, course or entitlement master data;
- direct writes to `studyainow-db`;
- automatic publication that bypasses the required human approval gate.

## Git boundary

- The only Git root is the parent repository at `studyainow/Code`.
- Do not run `git init` here and do not add a nested repository.
- Commit scope: `news-api`.
- Worker name: `studyai-news-api`.
- The API Worker should be reachable from `studyai-news-web` through a Service Binding rather than a second public origin.

## Planning source

- Product requirements: `../../PRD/News/`
- Approved execution plan: `../docs/news/CODEX_DEVELOPMENT_PLAN.zh-CN.md`

Implementation must wait for explicit plan approval.
