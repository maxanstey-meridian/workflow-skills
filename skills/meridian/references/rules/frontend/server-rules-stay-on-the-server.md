## Server rules stay on the server

**Law:** the UI never re-derives a rule the server decides. Whether an action may
happen now, whether an entity is editable, whether a draft differs from what is
published: read the server's answer from the read model, as `availableActions`,
a capability set, or a named flag (`canPost`, `hasUnpublishedChanges`). If the
DTO lacks it, add it to the DTO. Do not work it out from status strings,
timestamps, counters, version lists or roles.

Roles are no exception. Which pages, tabs and buttons a user sees comes from
capabilities the server sends with the session, computed from the same named
policies its endpoints enforce, not from comparing the user's role.

A copy that agrees with the server today is still a copy. Agreement sets how
soon to remove it, not whether.

Server-owned ids are the same. A route, link, query value, request or
comparison takes the id from the DTO, never a hand-written literal such as
`"acme-crm"`. A table keyed on an id may map it only to presentation (labels,
colours, icons; see below).

The UI owns client state only: unsaved edits, requests in flight, and the
validity of input the server hasn't seen. Gate an action on the server's answer
*and* client state, never on a copy of the server's rule.

Checking unsaved input in the browser for fast feedback is client state, and
the server always checks again. The rule's inputs still come from the server:
limits and allowed choices travel on the DTO (as a `min`/`max` or an allowed
list), not as hand-copied constants or predicates. A bare constant that can't
travel on a DTO is held to the server's by a parity test.

Mapping a server value to a label, colour, icon or ordering is presentation and
belongs in `logic/`. The test: if the UI's copy were wrong, could the user
attempt something the server refuses, or miss something it allows? If so, it is
a rule, not presentation.
