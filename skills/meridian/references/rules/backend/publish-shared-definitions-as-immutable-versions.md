## Publish shared definitions as immutable versions

**Default:** A shared definition that other things consume (a template, list, boundary, type, or schema) has published, immutable versions, and every consumer, its draft included, pins the version it uses and moves to a newer one only by an explicit action that shows what changes.

**When:** Any definition with consumers. Runtime settings (credentials, endpoints, on/off) are not definitions and stay live. Freezing a copy when the consumer publishes is not enough, because a draft must not shift under its author.

Bad: A draft form whose dropdown changes when someone edits the shared list.
Good: The draft pinned to list version 3, with an "update to version 4" action that shows the difference.
