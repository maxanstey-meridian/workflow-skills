## Backend Defaults

Each line is a summary; the file in brackets (a rule file, or a design document
and the heading in it) states it in full. These Defaults apply together with the
cross-stack Defaults in the Defaults file beside this one.

- scheduled work runs off-peak and spread out: outside working hours, or before
  the day starts when a person sees its result, each tenant or subject offset by
  a stable hash of its id [`invariants/scheduled-work.md`]
- FluentResults is Application furniture, not Domain furniture
  [`coding/furniture-dependencies.md`]
- strategic DDD helps discover boundaries; tactical DDD is conditional
  [`backend/module-layout.md#core-principle`]
