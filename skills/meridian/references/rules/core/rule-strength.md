## Rule Strength

Every house doctrine statement has one of four strengths:

- **Law** — protects correctness, ownership, or dependency direction; a violation is a bug. If valid context contradicts it, it was a Default or a false positive, never a waived Law.
- **Default** — preferred greenfield choice; replace when a local constraint clearly points elsewhere.
- **Preference** — house consistency, no architectural claim.
- **Tooling** — current replaceable implementation choice.

Fail builds only for Laws and provable correctness constraints; warn on Defaults, inform on Preferences, and keep Tooling easy to update.
