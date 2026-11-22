## Give each read shape a named query

**Default:** Repositories load and save state for mutations; list rows, dropdowns, exports, dashboards, and API read models each belong to a named `*Query`, not the write repository.

**When:** Read paths on .NET or TypeScript. Trivial queries may load via the repository and map locally, then swap implementations when reads grow wider, slower, or UI-specific.

Bad: `FormRepository.GetDashboardRowsAsync()`.
Good: `ListFormDashboardRowsQuery`.
