# Codex instructions: studyai-news-api

These instructions apply only to this directory.

- Do not start implementation until the user approves `../docs/news/CODEX_DEVELOPMENT_PLAN.zh-CN.md`.
- Preserve the exact Cloudflare Worker name `studyai-news-api`.
- Keep this project inside the parent `studyainow/Code` Git repository. Never create a nested `.git` directory.
- Own API, schema, ingestion, AI workflow, audit and media persistence here. Public rendering and editor UI belong to `../studyai-news-web`.
- Use an independent News D1 and append-only migrations. Replay every migration from `0001` against a fresh local D1 before applying it remotely.
- Never write directly to `studyainow-db`. Resolve canonical StudyAINow user, organization, skill and course data through an explicit, versioned integration contract.
- Vector search may recall candidates but must never create or rename canonical skills. Persist score, evidence, model/prompt version and review state for every suggested link.
- All P0 content publication requires an authenticated human approval. Every publish, correction, withdrawal and retry must be idempotent and audited.
- Treat fetched pages and feeds as untrusted input. Enforce SSRF defenses, allowlisted protocols/hosts, size/time limits and prompt-injection isolation.
- Never commit `.dev.vars`, credentials, source snapshots, database files, generated audio, model output containing licensed full text, build output or Wrangler state.
- Limit cross-boundary edits to the explicitly approved ticket; report any required change outside this directory before making it.
