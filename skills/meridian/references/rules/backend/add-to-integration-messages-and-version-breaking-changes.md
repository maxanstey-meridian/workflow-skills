## Add to integration messages and version breaking changes

**Default:** An integration message (a durable event published across a module or service boundary) is append-only: change it by adding, and give a breaking change an explicit new version.

**When:** Messages published to another module or service.

Bad: A field removed from `FormPublished`.
Good: `FormPublishedV2` published beside the old message until consumers move.
