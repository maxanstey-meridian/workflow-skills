## Build every generated file from its list

**Preference:** Generate role files from `roles.list`, rule files from `rules-<name>.list`, and `rule`-line files from their named rule in list order; never hand-edit them, and let the build refuse any unlisted part or rule.

**When:** Adding, renaming, or removing a role part or rule, or changing anything under a routine's `references/`.

Bad: Editing `references/filler.md` by hand, or leaving a rule out of every `rules-<name>.list`.
Good: Editing the source under `roles/` or `rules/`, listing it in order, and running `node lib/build-roles/src/cli.ts`.
