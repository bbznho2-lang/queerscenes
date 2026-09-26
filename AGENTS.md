# Project Architecture

- Route subscription self-service through `/manage-subscription` before the external Stripe portal so retention messaging remains centralized and Stripe remains the billing authority.
- Record confirmed billing portal openings as supporter events so admins can monitor cancellation intent without changing Stripe subscriptions.
- Treat `customer.subscription.deleted` as the authoritative completed-cancellation signal; deduplicate by Stripe event and preserve access when another active entitlement exists.