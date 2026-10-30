# Project Architecture

- Defer authenticated requests out of auth event callbacks and skip role reloads on token refresh; this prevents session-lock deadlocks and refresh-request amplification.
- Validate restored users with getUser and keep auth loading until role verification completes; render account sign-in directly at /admin on fresh devices without navigating away, then require the existing administrator role and PIN.
- Keep owner-authored privacy content on /privacy-policy with /privacy as an alias; this preserves public deep links without using platform-owned Trust center routes.

- Route subscription self-service through `/manage-subscription` before the external Stripe portal so retention messaging remains centralized and Stripe remains the billing authority.
- Record confirmed billing portal openings as supporter events so admins can monitor cancellation intent without changing Stripe subscriptions.
- Treat `customer.subscription.deleted` as the authoritative completed-cancellation signal; deduplicate by Stripe event and preserve access when another active entitlement exists.
- Supporter access must use only monthly, quarterly, or annual plans with an explicit expiration date; lifetime access is not supported.
- Keep subtitle request forms and administration in dedicated components; enforce ownership, active access and case-insensitive deduplication in the database so client edits cannot bypass restrictions.
- Generate subtitle completion messages through a database trigger in the existing direct-message inbox, with optional notification title and internal title link, so completion and delivery are atomic and repeat clicks cannot duplicate notifications.