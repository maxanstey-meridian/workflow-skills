## Give each read shape a named query

**Default:** A repository loads and saves the state a mutation needs; list rows, dropdown options, exports, dashboards, and API read models (the objects the server returns for a screen) each belong to a named query, not to the write repository.

**When:** Read paths on .NET or TypeScript. A trivial query may load through the repository and map locally; when the read grows wider, slower, or UI-specific, replace the query's implementation and leave the repository alone.

Bad: `FormRepository.GetDashboardRowsAsync()`.
Good: `ListFormDashboardRowsQuery`.
