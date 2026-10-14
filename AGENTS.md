# Project Architecture

- Route subscription self-service through `/manage-subscription` before the external Stripe portal so retention messaging remains centralized and Stripe remains the billing authority.
- Record confirmed billing portal openings as supporter events so admins can monitor cancellation intent without changing Stripe subscriptions.
- Treat `customer.subscription.deleted` as the authoritative completed-cancellation signal; deduplicate by Stripe event and preserve access when another active entitlement exists.
- Supporter access must use only monthly, quarterly, or annual plans with an explicit expiration date; lifetime access is not supported.
- Keep subtitle request forms and administration in dedicated components; enforce ownership, active access and case-insensitive deduplication in the database so client edits cannot bypass restrictions.
- Generate subtitle completion messages through a database trigger in the existing direct-message inbox, with optional notification title and internal title link, so completion and delivery are atomic and repeat clicks cannot duplicate notifications.