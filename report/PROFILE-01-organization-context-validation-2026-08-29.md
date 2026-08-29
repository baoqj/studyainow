# PROFILE-01 — Organization context in the personal profile API

Date: 2026-08-29

## Scope

- Returns the active user's organization name, public ID, membership role, and joined timestamp from `GET /api/profile`.
- Preserves those fields in the `PUT /api/profile` response, so saving a personal profile does not make the organization-context UI appear empty until a full reload.
- Uses a left join, so users without an organization continue to receive their profile successfully with null organization fields.

## Local verification

| Check | Result |
| --- | --- |
| `npm run verify:profile-organization` | Passed — required fields and user-owned left joins occur in both GET and PUT responses. |
| `npm run verify:admin` | Passed — current organization/Leader policy remains unchanged. |
| `npm run typecheck` | Passed. |
| `npm run build` | Passed. |
| `wrangler@4.127.1 deploy --dry-run` | Passed; no D1 migration is required. |

## Rollback

Revert this release and redeploy the previous Worker version. The response expansion does not alter stored data.
