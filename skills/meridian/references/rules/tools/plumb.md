## Mechanical Checking

[Plumb](https://github.com/maxanstey-meridian/plumb) checks a repo against this
doctrine. Run it only when the repo's instructions name Plumb or the repo
defines a Plumb task or script; otherwise skip it, and don't report it as
unavailable. When it applies, run it after completing changes and fix all
error-level findings:

- if the repo defines a Plumb task or script (for example `task plumb`), run
  that: it applies the repo's own baseline and options;
- otherwise run it the way the repo's instructions say, or from a local
  checkout: `<plumb-checkout>/plumb . --json`.

If the repo uses Plumb but it won't run, say so in your report rather than
skipping the check silently. Setup is in its README.

Each finding's `docRef` (`rules/<folder>/<file>.md#<slug>`) names the rule file
under this skill's `references/` and the heading it enforces; read that rule
before fixing. Fix `error` findings unprompted. For `warn` findings, fix them or
state the exception that applies. Do not re-run Plumb in a loop on a repo you
have not changed.

Plumb's findings are the floor, not the review. A clean Plumb run is not a
review.
