# Study AI Now! email service

## Delivery contract

- **Provider:** Resend `POST /emails`, invoked only from the Worker. The API key is the Worker secret `EMAIL_RESEND_API_KEY`; it is never returned to the browser or stored in D1. `RESEND_API_KEY` is read only as a backwards-compatible fallback.
- **Webhook receiver:** `EMAIL_RESEND_ENDPOINT_URL=/api/webhooks/resend` resolves to `https://studyai.now/api/webhooks/resend`. Delivery/bounce callbacks are processed only when the optional secret `EMAIL_RESEND_WEBHOOK_SECRET` is set to the Resend/Svix `whsec_...` signing secret.
- **Sender and replies:** `Study AI Now! <info@studyai.now>`. `RESEND_FROM_EMAIL` can override the display sender, but must remain an address under the Resend-verified `studyai.now` domain.
- **Records:** every application send is written to `email_deliveries` with recipient, event type, category, locale, Resend message ID, outcome, and a durable idempotency key. No password, reset token, or rendered HTML is stored.
- **Duplicate safety:** the D1 unique key prevents repeat campaigns; the same key is supplied as Resend's `Idempotency-Key` for transport-level retry protection.
- **Preferences:** transactional security mail always sends. Engagement mail observes `notification_email_enabled`; marketing mail observes `marketing_email_enabled`. A user can change both in **My space → Settings**.
- **Locale:** the recipient's `preferred_locale` selects Simplified Chinese, Traditional Chinese, English, French, or Spanish. New password registrations send the selected browser locale to the Worker.

## Template catalogue

| Category | Template / trigger | Delivery state |
| --- | --- | --- |
| Account & security | Registration email verification / activation | Implemented on registration; 24-hour, one-time link |
| Account & security | Password recovery / reset | Implemented on password-recovery request; 30-minute, one-time link |
| Account & security | New device or unfamiliar IP sign-in | Implemented for a newly seen device/IP after a prior session |
| Account & security | Password changed | Implemented after a successful password reset or in-account password change |
| Account & security | Email/phone change confirmation | Template ready; dispatch when those profile mutations are introduced |
| Account & security | Account-deletion confirmation / farewell | Template ready; dispatch when the deletion workflow is introduced |
| Behaviour & interaction | New message or support reply | Template ready; dispatch from the messaging/support module |
| Behaviour & interaction | Collaboration invite / @mention | Template ready; dispatch from the collaboration module |
| Behaviour & interaction | Course review, work order, resume/export task completion | Course review and resume ready are implemented; the generic task-status template is ready for future work orders and export links |
| Behaviour & interaction | Like, comment, bookmark feedback | Template ready; dispatch only after community interactions are enabled |
| Product & operations | Day 1, 3, 7 onboarding | Implemented by the daily Worker Cron after email verification |
| Product & operations | Learning milestone / weekly report | Template ready; data job can dispatch a personalised report |
| Product & operations | 30-day inactive-user re-engagement | Implemented by the daily Worker Cron, marketing preference required |
| Product & operations | Release notes | Template ready; publish through the protected admin sender |
| Product & operations | Events, promotions, referral rewards | Template ready; marketing preference required |
| Product & operations | Survey / NPS | Template ready; marketing preference required |
| Product & operations | Newsletter / company news | Template ready; marketing preference required |

## Scheduled work

The Worker runs the lifecycle campaign at `15 13 * * *` UTC. It selects bounded batches of verified active users, sends onboarding on days 1, 3, and 7, and sends a re-engagement email only when the last login is at least 30 days ago. `email_deliveries` makes each stage idempotent; the worker logs sent, skipped, and failed outcomes for audit.

## Administration and testing

`POST /api/admin/email/test` requires an authenticated administrator. It can render and send any catalogue template to the administrator's own address by default. It is the safe way to confirm Resend domain configuration after deployment.

Before production use, verify the `studyai.now` domain and `EMAIL_RESEND_API_KEY` in Resend. Resend requires the `from` address to match a verified domain and supports idempotency on `POST /emails`: [Resend sending API](https://resend.com/docs/api-reference/emails/send-email), [Resend idempotency keys](https://resend.com/docs/dashboard/emails/idempotency-keys).
