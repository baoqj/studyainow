# ADMIN-01 Organization and Activity Validation

Date: 2026-08-29

## Scope

This batch reconciles source control with the already-applied production
migrations `0038_user_activity_history.sql` and
`0039_organizations_and_leaders.sql`, then publishes the matching runtime
implementation:

- authenticated page-view activity (the server derives ownership from the
  session; the client never submits a user id);
- Administrator and organization-scoped Leader access;
- organization creation, membership, Leader assignment, invitations,
  messages, audited edits, and user-detail history;
- invitation-aware registration and Google OAuth handoff;
- Leader-safe admin navigation, plus direct `/admin/users/:userId` and
  `/admin/organizations/:organizationId` routes.

The interview-management screen is deliberately not included. Its navigation
entry is omitted until its independent feature batch is ready, so no route in
this release points to a missing page.

## Validation

| Check | Result |
| --- | --- |
| Admin/organization contract verification | Passed |
| TypeScript | Passed |
| Production build | Passed |
| Browser public-route regression | Passed (6/6) |
| Fresh local D1 replay, `0001` through `0041` | Passed |
| Fresh D1 schema confirmation | Passed: `user_activity_events`, `organizations`, `organization_invites`, and `organization_messages` exist |

## Safety properties

- Leader access requires an active organization and is checked in server-side
  permission helpers.
- Organization writes use D1 batches, optimistic version checks where needed,
  hashed invite codes, idempotent message request ids, and audit logs.
- The global activity tracker records only a sanitized pathname and the visible
  page heading after a signed-in session is confirmed.
- Reconciliation adds source files for migrations already in D1; it does not
  rewrite or reapply their history.

## Post-deployment verification

1. Confirm `/api/auth/me` remains unaffected for anonymous users.
2. Confirm unauthenticated `/admin` redirects to login rather than rendering a
   protected shell.
3. Confirm the remote D1 ledger still records `0038` and `0039`, and that the
   listed organization/activity tables exist.
4. Verify an administrator can load organization and user-detail APIs; a
   Leader must be restricted to its own active organization.
