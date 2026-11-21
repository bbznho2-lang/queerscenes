# Recent Updates order review

Rule: the administrator's chosen release order and title/episode selection must agree with the public Recent Updates list, including after refresh.

Code read this turn:
- FeaturedEpisodesAdmin: manual title/episode additions append after the highest position; movement assigns distinct positions; title/episode switching keeps position; removal leaves relative order intact. Added one mutation lock across all these actions and checked single-row updates/deletes. Polling pauses during mutation; older loads cannot replace newer state.
- RecentUpdatesSection: same position, descending creation time and ID tie-breaker as the editor. Its change callback reloads immediately; the 60-second poll remains. Added superseded-response protection so an earlier refresh cannot undo the visible order.
- Browse: passes administrator status and catalog-length revision, opens Recent Updates management locally and delegates catalog creation to the existing editor/copy flows. No separate release ordering logic.
- EditContentDialog: new title insertion invokes the existing database trigger; season edits do not independently reorder featured entries. No change needed.
- AddExistingContentDialog: copies titles/episodes and invokes the same title-insert trigger. No separate release position writes. No change needed.
- Live database feature_new_catalog_title: new eligible movie/series enters before the current minimum position without reordering existing entries; does not backfill history. No change needed for this reported manual-order issue.
- Shared featured-order helpers: list-index movement works with duplicate positions; manual append uses maximum position, not item count.
- Repository search found no other runtime featured_episodes writers/readers or background server functions. Existing editor/public polling is the refresh path.

Validation: six tests passed for tied-position movement, append positioning, persisted order, new-season selection, overlapping additions and stale public refreshes. Preview build passed. The available session is non-admin, so live administrator editing and production reorder readback remain unverified. No live records, account permissions, settings, payments or sent notifications were changed.