## Defaults

Each line is a summary; the file in brackets (a rule file, or a design document
and the heading in it) states it in full. The backend and frontend Defaults
files beside this one hold the Defaults for one stack.

- prefer explicit, honest boundaries [`coding/core-rule.md`]
- seams must be earned [`coding/seams.md`]
- keep things local and preserve ownership when they gain more consumers
  [`coding/local-before-shared.md`]
- use the narrowest owner and smallest mechanism that make an invariant true
  [`invariants/invariant-enforcement.md`]
- a lifecycle with several guarded actions gets one pure decider
  (`Refusal` / `Available`) that guards the use cases and feeds
  `availableActions`; the decider explains, the database enforces
  [`invariants/deciders.md`]
- generated code is an external contract representation; add an
  anti-corruption layer only when it adds semantic value
  [`coding/generated-code.md`]
- tests default to real behaviour over mock soup and mechanically enforce
  modular boundaries
  [`tests/core-principle.md`, `tests/default-bias.md`,
  `tests/what-to-test.md`]
