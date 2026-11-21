# Project Architecture
- Membership lookup must use caller-scoped profile access; comment badges must not query other authors' live subscription status, and new wishlist requests start pending with no administrator reply.
- Automatically feature new movie/series inserts with a database trigger, and manage featured title/episode choices in Browse's Recent Updates; this covers every creation path without backfilling old records.
- Recent Updates editor and public list share position/creation/ID ordering; manual reordering assigns distinct positions and appending uses the highest position, because legacy ties make position swaps ineffective.
- Serialize Recent Updates editor mutations and discard superseded editor/public refresh responses so polling cannot restore stale release choices or order.
- Paginate unbounded episode reads, including admin RPCs, and Recent Updates catalog reads with a stable ID tie-breaker below the Data API cap; otherwise new seasons disappear in selection, playback, editing or copying.
- Treat the editor's loaded link list as authoritative and derive legacy player URLs from it; check every episode write so removed links cannot return and failed updates never report success.
- Persist only changed episodes and keep content/details editor initialization keyed to title identity; this avoids long-series write storms and resets of unsaved drafts on background refresh.
- Ignore repeated same-user SIGNED_IN events after role verification and refresh focused players only while access is blocked; tab switching must not reset verified access or playback.
- Use the catalog-section retirement predicate for catalog surfaces and reject retired sections on old player links; archive removed titles instead of deleting their episodes or user history.

- Defer authenticated requests out of auth event callbacks and skip role reloads on token refresh; this prevents session-lock deadlocks and refresh-request amplification.
- Validate restored users with getUser and keep auth loading until role verification completes; render account sign-in directly at /admin on fresh devices without navigating away, then require the existing administrator role and PIN.
- Correct device clock skew app-wide (Date/Date.now offset measured from fresh token iat on sign-in and token refresh, loaded first in main.tsx) instead of rejecting sign-ins; a skewed clock otherwise causes endless token refreshes and forced sign-out, and users often can't fix wrong Windows time zones.
- Show the admin PIN gate before loading dashboard data, and start dashboard queries and subscriptions only after role and PIN verification; slow analytics must not block account recognition or PIN entry.
- Keep owner-authored privacy content on /privacy-policy with /privacy as an alias; this preserves public deep links without using platform-owned Trust center routes.

- Route subscription self-service through `/manage-subscription` before the external Stripe portal so retention messaging remains centralized and Stripe remains the billing authority.
- Record confirmed billing portal openings as supporter events so admins can monitor cancellation intent without changing Stripe subscriptions.
- Treat `customer.subscription.deleted` as the authoritative completed-cancellation signal; deduplicate by Stripe event and preserve access when another active entitlement exists.
- Supporter access must use only monthly, quarterly, or annual plans with an explicit expiration date; lifetime access is not supported.
- Keep subtitle request forms and administration in dedicated components; enforce ownership, active access and case-insensitive deduplication in the database so client edits cannot bypass restrictions.
- Generate subtitle completion messages through a database trigger in the existing direct-message inbox, with optional notification title and internal title link, so completion and delivery are atomic and repeat clicks cannot duplicate notifications.
- Admin panel dates, times and day buckets must use the pinned-timezone helpers in src/lib/sp-time.ts (currently America/Manaus via the SP_TIMEZONE constant), never device-locale formatting; a misconfigured device clock otherwise shifts hours and breaks the daily access chart.
- The admin dashboard refetches data on a 60s interval alongside realtime channels; keep the polling fallback so the panel still updates if the realtime socket drops.
- The protect_profile_premium_fields trigger only allows premium-field updates when the transaction sets `set_config('app.premium_update_allowed','on',true)` (used by claim_supporter_for_current_user); without it, SECURITY DEFINER alone is not enough because the trigger still sees the caller's auth.uid() and silently reverts.
