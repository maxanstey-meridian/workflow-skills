## Handle a new enum value in every consumer

**Default:** When you add an enum value, status, or type constant, find every consumer (switches, filter arrays, display logic, serialisation) and handle the new value in each, reading outside the diff.

**When:** Adding or reviewing a new value of a closed set, on any stack.

Bad: `Suspended` added to `RecordStatus` and to one switch.
Good: `Suspended` also added to the status filter list, the label map, and the export mapping.
