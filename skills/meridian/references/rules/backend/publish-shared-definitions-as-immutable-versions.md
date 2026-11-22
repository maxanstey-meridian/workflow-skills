## Publish shared definitions as immutable versions

**Default:** Give every shared definition consumed elsewhere (templates, lists, boundaries, types, schemas) published, immutable versions; every consumer — drafts included — pins its version and upgrades only via an explicit diff-showing action.

**When:** Any definition with consumers (runtime settings like credentials, endpoints, or toggles stay live). Freezing only on consumer publish is insufficient because drafts must not shift under authors.

Bad: A draft form whose dropdown changes when someone edits the shared list.
Good: The draft pinned to list v3 with an "update to v4" action showing the diff.
