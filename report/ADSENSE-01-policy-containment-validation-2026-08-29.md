# ADSENSE-01 — AdSense policy containment

Date: 2026-08-29

## Scope

This release intentionally contains advertising rather than turning it on:

- Adds the Google AdSense ownership meta tag for publisher `ca-pub-2674524487916692`.
- Removes the global AdSense loader from the HTML shell, so no route silently initializes Google ads.
- Adds five-language privacy disclosures and localized links to Google’s partner-site, ads-settings, and privacy resources.
- Adds an automated static policy verifier.

No ad component, slot, or client-side loader is included in this release. This avoids ads on authentication, account, resume, administration, legal, error, and loading pages while the required Google-certified CMP and the AdSense Auto ads setting remain external configuration items.

## Local verification

| Check | Result |
| --- | --- |
| `npm run verify:adsense` | Passed — ownership meta is present; global loader and placements are absent; all five privacy disclosures and localized resource links are present. |
| `npm run typecheck` | Passed. |
| `npm run build` | Passed. The existing Course/15 bundle-size warning is outside this release. |
| `wrangler@4.127.1 deploy --dry-run` | Passed using production bindings. |

## Production verification

Pending deployment. The production check must confirm the ownership meta and absence of AdSense network requests on public and private routes.

## Follow-up gate for manual advertising

Before a future placement release:

1. Publish a Google-certified consent-management message for EEA, UK, and Switzerland where required.
2. Turn off AdSense Auto ads in the AdSense console, or explicitly document approved automated placements.
3. Add only content-page manual placements, then run a browser policy check across course lessons, interview questions, login, resume, administration, legal, error, and loading routes.

## Rollback

Revert this commit or redeploy the prior Worker version. There is no D1 migration or destructive data operation.
