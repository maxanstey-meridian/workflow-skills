## Sign 7: Flag compat for consumers we own

**Default:** Flag deprecated overloads, shims, toggles for dead paths, schema-version keys, and readers for old data shapes kept for consumers we own.

**When:** Reviewing compatibility layers and migration shims; prove each finding by confirming every consumer of the shim is in this repo or is the team's own. Do not flag a published package's deprecations kept under its versioning rules.

Bad: Flagging a `[Obsolete]` overload in a published NuGet package before its next major version, or flagging a shim without checking whether external callers use it.
Good: Flagging a v1 JSON payload reader after confirming every writer and reader lives in this repo and all stored rows have been migrated.
