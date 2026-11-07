## Rule Strength

Every house doctrine statement belongs to one of four strengths:

- **Law** — protects correctness, ownership, or dependency direction; a
  violation is a bug. If valid context contradicts it, the statement was a
  default or the checker produced a false positive, not a waived law
- **Default** — the preferred greenfield choice; replace it when the local
  constraint clearly points elsewhere
- **Preference** — house consistency with no claim of architectural necessity
- **Tooling** — a current replaceable implementation choice

Mechanical checks may fail builds only for laws and mechanically provable
correctness constraints. Defaults should warn, preferences should inform, and
tooling rules should remain easy to update. Do not give a filename convention
the same authority as an atomicity or dependency rule.
