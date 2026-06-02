I have identified a critical issue preventing admins from adding or updating content. A previous security migration revoked `SELECT` permissions on the `player_url` column for the `authenticated` role. Because the frontend uses `.select()` (which defaults to selecting all columns) during insertion, the database returns a permission error, causing the entire save operation to fail.

I will:
1. Update `src/components/EditContentDialog.tsx` to explicitly select only the `id` column during insertion to avoid the permission error on `player_url`.
2. Update the UI in `EditContentDialog.tsx` to include "Anime" options for content type and section, which are supported by the database but currently missing from the dialog.
3. Add a database migration to ensure the `admin` role has explicit full permissions on the `contents` and `episodes` tables, and ensure that the `player_url` column remains protected for regular users while allowing admins to manage it.

### Technical Details
- Change `.select()` to `.select('id')` in `src/components/EditContentDialog.tsx`.
- Add `anime` type and `animes` section to the select components.
- Migration to explicitly GRANT permissions to admins for content management.
