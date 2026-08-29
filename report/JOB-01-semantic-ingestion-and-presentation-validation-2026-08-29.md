# JOB-01 Semantic Ingestion and Presentation Validation

Date: 2026-08-29

## Scope

This release batch isolates the job-data changes that are safe to deploy
together:

- `0035`: versioned source/model tags, durable vector-index retry records, and
  immutable collection timestamps;
- `0036`: seventeen employer-owned Greenhouse/Ashby sources, all defaulting to
  `metadata_only` public presentation;
- `0037`: policy-derived public excerpts and resumable presentation refreshes;
- public job APIs and detail UI that expose only public sections, plus clearly
  labelled semantic signals where reviewed text evidence is unavailable;
- scheduled, bounded source bootstrap, presentation refresh, knowledge-graph
  refresh, and vector indexing.

Equifax/Workday (`0040`) is intentionally excluded from this batch. Its custom
source adapter will be checked and released independently before it can enable
another external source.

## Migration and runtime checks

| Check | Result |
| --- | --- |
| Fresh local D1 replay, migrations `0001` through `0037` | Passed |
| Job presentation unit verification | Passed |
| Semantic tags/vector-index verification | Passed |
| Existing job skill-map verification | Passed |
| Knowledge-graph verification | Passed after updating the stale no-provider assertion for the intentional optional Workers AI fallback |
| TypeScript (`npm run typecheck`) | Passed |
| Production build (`npm run build`) | Passed |
| Wrangler production dry run | Passed; D1, R2, Workers AI, and `studyainow-job-vectors-v1` bindings resolved |

## Release safety

The database migration is deployed before Worker code. New source records are
ingested one at a time on the existing two-minute maintenance turn and then
remain on the established twice-daily cadence. Source descriptions for the new
employers remain private analysis input; the public catalogue exposes metadata
only unless a separately reviewed display policy authorizes an excerpt.

## Post-deployment checks

1. Confirm D1 has applied `0035`, `0036`, and `0037`.
2. Confirm the Worker reports the AI and Vectorize bindings.
3. Confirm `/api/jobs` returns public tags and the public detail endpoint does
   not return `analysis_only` sections.
4. Confirm source bootstrap is bounded and that source errors do not stop the
   existing URL-inspection/knowledge-graph cron paths.
