# Contributing

This file records how the routines are put together, why, and the one format for a rule.

## The run

You write a spec. The orchestrator starts subagents. A critic checks each round. The auditor writes the report. The orchestrator relays it word for word. There are no ledgers, and no checks of checks.

The orchestrator only dispatches. The auditor writes the report, so the orchestrator never marks its own run.

## Layout

```
skills/<routine>/
  SKILL.md            hand-written: the orchestrator's file
  roles/              hand-written: the routine's roles, and roles.list
  references/         generated: one file per role, and the rule files

skills/meridian/references/
  rules/              hand-written: the rule library
  rules-<name>.list   which rules go in each rule file
```

## A routine owns its roles

A role is one subagent's whole job in one routine. Its files live in `skills/<routine>/roles/`. There is no top-level `roles/` folder: `/go`'s critic and `/cycle`'s critic are different jobs with the same name, and a shared file makes one of them override the other.

A part is shared only inside one routine, and only when every role takes it unchanged.

## Generated files

Role files and rule files are generated from colocated `.list` files by `sh scripts/build-roles.sh`. Generation is what lets a role share a part and still be one file to read. Never edit `references/` by hand. `Taskfile.yml` names the commands: `task build` runs the script, and `task gate`, which CI and `/cycle` run, also fails when a generated file was out of date. The build refuses orphans too: a rule in no list, a rule file no role of its routine reads, a part no role uses, and a generated file no line builds.

## The rule library

`skills/meridian/references/rules/` holds one rule per file, granular by single responsibility. Routines read it as generated rule files, one per `rules-<name>.list`, each small enough to come back whole in one file read.

## Format of a rule

Every rule file has the same fields, in this order:

```
## <Title: the rule, as an imperative>

**<Law | Default | Preference | Tooling>:** <Description: the rule in one sentence.>

**When:** <where it applies>

Bad: <a short example>
Good: <the same case, done right>

Links: <optional: where to read more, as Markdown links separated by commas>
```

`Links:` is the one optional field. It is the last line of the file, and the only place a rule holds a URL.

`core/rule-strength.md` says what Law, Default, Preference, and Tooling mean.
