# Roadmap

## Episode edits and tab switching
- [x] Sweep other catalog entry points, editors, account screens, live updates and link database functions; preserve drafts in the details editor too.
- [x] Diagnose and fix episode link save errors without restoring old links.
- [x] Keep the current page and unsaved editor state stable when switching browser tabs.
- [x] Verify episode edits and tab switching with tests and the signed-in site.

- [x] Verify existing administrator recognition and remove dashboard loading from the PIN entry path on a fresh notebook session.

- [x] Keep admin entry on /admin and verify signed-out, sign-in and protected access states.

- [x] Fix admin entry on a fresh computer and verify the existing account.
- [x] Restore the Privacy policy page with owner-specific content and verify deep links.

- [x] Update only the requested home hero copy.
- [x] Add Supporter subtitle requests with duplicate prevention and owner/admin access.
- [x] Add the admin request tab and atomic completion notifications in the existing inbox.
- [x] Verify submission, completion, inbox delivery and access restrictions.

- [x] Add Manage subscription link in Profile.
- [x] Create a retention-first subscription management page.
- [x] Link the confirmed exit to the Stripe customer portal.
- [x] Update the cancellation FAQ with clear steps.
- [x] Simplify Support to subscription questions only.
- [x] Verify compilation and the complete flow on desktop and mobile.
- [x] Record each confirmed billing portal opening.
- [x] Show billing portal activity with user details in the admin panel.
- [x] Verify the tracking and admin list.
- [x] Store verified Stripe cancellation records without duplicates.
- [x] Link real cancellations to the matching user and revoke only the ended entitlement.
- [x] Distinguish Stripe-confirmed cancellations in the admin panel.
- [x] Deploy and test the updated Stripe webhook.
- [x] Remove lifetime plans from the admin, account labels, and backend rules.
- [x] Remove inactive historical lifetime entries and verify cancellation behavior.
- [x] Preserve active yearly access when another Stripe subscription is canceled.
- [x] Reactivate expired supporters from the admin toggle with a new monthly validity period.
- [x] Update DOMPurify beyond 3.4.12 and verify the lockfiles.
- [x] Update React Router DOM beyond 6.30.5 and React Router to 7.18.0 or later.
- [x] Scan production dependencies and verify the site build.

## Remove retired drama categories
- [x] Remove category mentions, sections and editor/wishlist options.
- [x] Remove their titles from the public catalog, including duplicate listings.
- [x] Verify remaining catalog and page rendering.

## Saved playback links
- [x] Check shared movie/episode editor and immediate player refresh.
- [x] Check catalog, title page, search, Top 10, Recent Updates, Continue Watching and A-Z navigation for stale URL storage.
- [x] Check database link readers and duplicate-mirroring triggers without changing access rules or historical records.
- [x] Prevent Exclusives copies from reporting success when episode links cannot be loaded.
- [x] Run focused tests and verify replacement/removal and duplicate playback through the signed-in UI.
