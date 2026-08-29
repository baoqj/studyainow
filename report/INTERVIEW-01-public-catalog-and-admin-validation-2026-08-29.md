# INTERVIEW-01 — Public interview practice catalog and administration

Date: 2026-08-29
Release scope: public interview-practice catalog, five-language content validation, progressive inference-engine practice set, and protected administration analytics.

## Scope and boundaries

- Adds two public, directly addressable interview sets: the existing six-level AI engineering assessment and a five-stage inference-engine scheduler assessment.
- Adds desktop filters and a mobile filter drawer; question pages retain locally stored reveal and self-assessment progress.
- Adds an administrator/Leader read-only analytics endpoint and `/admin/interviews` management page. The Worker route delegates authorization to `requireAdminOrLeader`; Leaders receive a non-identifying, read-only aggregate response.
- Does not add or alter D1 schema. Remote D1 migration inspection confirmed that there are no pending migrations.
- Does not include AdSense configuration, course localization, or LLM generation work. The question page deliberately has no dependency on the separate advertising batch.

## Local verification

| Check | Result |
| --- | --- |
| `npm run verify:interview` | Passed — both interview sets validated in English, Simplified Chinese, Traditional Chinese, French, and Spanish. |
| `npm run verify:admin` | Passed — Worker route, shell route, authorization and analytics contracts validated. |
| `npm run typecheck` | Passed. |
| `npm run build` | Passed. The known large course-content bundle warning remains outside this batch. |
| `npx playwright test --config playwright.config.ts --reporter=line` | Passed — 13 tests, including public-page, route-recovery, desktop/mobile interview filters, trace behavior, invalid-route noindex behavior, and French content. |
| `wrangler d1 migrations list studyainow-db --remote` | Passed — no migrations to apply. |
| `wrangler@4.127.1 deploy --dry-run` | Passed with the production bindings for `studyainow-web`, `studyainow-db`, `studyainow-storage`, Workers AI and Vectorize. |

## Production verification

Pending deployment. This section is updated only after the Worker deployment and direct `studyai.now` checks complete.

## Rollback

Re-deploy the immediately preceding Worker version or revert this release commit. No data migration or destructive operation is part of this batch.
