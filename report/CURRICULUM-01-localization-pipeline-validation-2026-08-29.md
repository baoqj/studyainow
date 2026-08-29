# CURRICULUM-01 — Course/15 localization production pipeline

Date: 2026-08-29

## Scope

- Adds a private, token-protected Worker endpoint for rewriting bounded batches of Course/15 Markdown with Worker-held LLM credentials.
- Uses `LLM_DEEPSEEK_API` first and `LLM_MEGANOVA_API` as a fallback; neither provider key is sent to the browser or written to source control.
- Restricts each request to eight Markdown files, 72,000 source characters in total, and 18,000 characters per file.
- Rejects malformed model output, changed relative paths, missing or changed stable frontmatter identifiers, shortened course material, and incomplete batches.
- Adds a resumable local compiler and a five-language file validator. Existing valid output is skipped unless explicitly overwritten.

## Deliberate release boundary

This release does not alter front-end course loading and does not publish incomplete localizations. At validation time, Course/15 has complete Simplified Chinese source, partial English output for one course, and no complete Traditional Chinese, French, or Spanish course. Deploying the unfinished lazy-loader implementation would send existing localized course cards to 404 pages, so it is intentionally withheld.

## Local verification

| Check | Result |
| --- | --- |
| `npm run verify:curriculum-localization-pipeline` | Passed — request bounds, token protection, DeepSeek/MegaNova fallback, structural output validation, resumability, and locale quality gates verified. |
| `npm run typecheck` | Passed. |
| `npm run build` | Passed. The existing Course/15 bundle-size warning remains the next separate performance release. |
| `wrangler@4.127.1 deploy --dry-run` | Passed with production bindings. |

## Production verification

Pending deployment. After deployment, verify that a request without `Authorization: Bearer <CURRICULUM_LOCALIZATION_TOKEN>` receives 401, then run one real bounded outline rewrite before scheduling full course/locale production.

## Rollback

Revert this commit or redeploy the preceding Worker version. No database migration or public route behavior is changed.
