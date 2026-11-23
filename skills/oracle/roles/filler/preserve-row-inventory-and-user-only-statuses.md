## Preserve row inventory and user-only statuses

**Law:** Never set `other-level` or `struck`, never delete, rename, or merge rows or alter `id`, `where`, `meta`, `gone`, or `unplaced:` entries, and preserve any human-written `ruling`, `other-level`, or `struck` rows already in `<slice>.oracle.yaml`.

**When:** Editing any `<slice>.oracle.yaml` during a `filler` pass.

Bad: Setting `status: other-level` on a `403` row, deleting a `gone: true` row, or overwriting a human `ruling`.
Good: Leaving `id`, `where`, `meta`, `gone`, `unplaced:`, and existing `ruling`/`other-level`/`struck` rows untouched, and using only `active`, `shortfall`, or `cant-happen`.
