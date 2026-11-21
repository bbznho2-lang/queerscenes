# Season loading review

Rule: saved seasons must remain available to select, feature and watch as the catalog grows, within existing access rules.

Read and corrected:
- Recent Updates editor: paginated catalog reads; removed the 500-result search cutoff, which could hide later seasons in long series; visible-tab polling refreshes an open picker.
- Public Recent Updates: paginated featured items and their episode/title metadata; preserves order and exact episode deep links, with existing 60-second refresh.
- Player: paginated matching episode reads; season tabs, Previous/Next and episode deep links use the complete loaded list. Existing duplicate-entry selection and access rules remain unchanged.
- Title page: paginated season metadata for related title entries; no longer infers season availability from a truncated list.
- Content editor and new-series flow: paginated admin episode RPC reads; existing inserts/updates persist the selected season and check failures, while preserving unchanged chapters and drafts.
- Exclusives copying: same paginated admin episode RPC reads, preserving every loaded season and checking failures before success.
- Paywall admin preview: paginated seasons so personalized comments use complete season metadata.
- Admin activity: paginated episode labels so later-season activity retains its season/episode labels.

Read and unchanged:
- Continue Watching and watch-progress writes: at most 20 exact episode references, with saved season and episode deep links; no unbounded season query.
- Browse cards, search, My List, Top 10, landing catalog and A–Z: navigate to title/player pages rather than independently loading seasons. Their title-only catalog limits are outside this season-loading correction.
- Database admin_get_episodes: checks administrator role and returns all episodes for the requested title; caller now paginates the Data API response.
- Database feature_new_catalog_title: creates a title-only Recent Updates entry on new movie/series insertion. Adding a season does not automatically replace the administrator's chosen featured item.
- Database get_episode_links/get_episode_player_url: exact episode lookup under existing access checks, no season truncation.
- Database mirror_episode_links: mirrors changed links to existing matching season/episode copies; does not delete or create seasons.
- No episode-loading background functions were found under the application server functions; existing Recent Updates/editor refresh timers were read.

Validation: 18 focused tests passed, including episodes beyond row 1,000 and editor/copy behavior. Real authenticated reads confirmed Yellow Jackets S3 (9 episodes) and S4 (1 episode). The title page rendered in the browser. The current session has neither administrator nor active Supporter access, so the administrator picker and paid playback could not be exercised end-to-end; account permissions were not changed. No existing catalog rows, billing records, messages or access settings were modified.