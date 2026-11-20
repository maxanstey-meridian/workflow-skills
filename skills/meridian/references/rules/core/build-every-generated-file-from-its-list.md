## Build every generated file from its list

**Preference:** A role file is the parts its `roles.list` line names, a rule file is the rules its `rules-<name>.list` names, and a `rule` line's file is the one rule it names, each joined in the list's order; none is hand-written, and a part, or a rule, that no line names is dead weight the build refuses.

**When:** Adding, renaming, or removing a role part or a rule in the house skills repo, or editing anything under a routine's `references/`.

Bad: Editing `references/filler.md` by hand, or leaving a rule file in the library that no `rules-<name>.list` names.
Good: Editing the part under `roles/` (or the rule under the rule library), naming it in its list in the order it should read, and running `sh scripts/build-roles.sh`.
