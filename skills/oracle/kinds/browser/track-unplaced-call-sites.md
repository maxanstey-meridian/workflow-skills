## Track unplaced call sites

**Law:** Emit any API call site the row script cannot attach to a slice or page as `{ id, unplaced, slice?, where? }` so it is tracked under `unplaced:` rather than silently skipped.

**When:** Writing or running a `browser` row script that discovers page-consumed API call sites.

Bad: Dropping an unmatched API call site because its file path did not match a page folder.
Good: Emitting `{ id: "archive_form", unplaced: "apps/ui/app/shared/useArchive.ts", where: "apps/ui/app/shared/useArchive.ts" }` so it appears under `unplaced:`.
