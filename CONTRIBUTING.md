# Contributing

This file records how the routines are put together, why, and the one format for a rule.

## The run

You write a spec. The orchestrator starts subagents. A critic checks each round. The auditor writes the report. The orchestrator relays it word for word. There are no ledgers, and no checks of checks.

The orchestrator only dispatches. The auditor writes the report, so the orchestrator never marks its own run.

## Layout

```
skills/<routine>/
  SKILL.md            hand-written: the orchestrator's file
  scripts/            hand-written: commands that use $0, $1, and so on, which a SKILL.md can't hold, and a routine's own scripts (test-oracle's ledger)
  roles/              hand-written: the routine's roles, and roles.list
  references/         generated: one file per role, and the rule files
  kinds/              hand-written, test-oracle only: what is true of one kind of case
  tracer/             hand-written, test-oracle only: a tiny CLI and, beside it, an `__oracle__` case with its row script, for running the skill on

skills/meridian/references/
  rules/              hand-written: the rule library
  rules-<name>.list   which rules go in each rule file
  rules-<name>.md     generated: the rule files the skill's SKILL.md sends a reader to
```

## A routine owns its roles

A role is one subagent's whole job in one routine. Its files live in `skills/<routine>/roles/`. There is no top-level `roles/` folder: `/go`'s critic and `/cycle`'s critic are different jobs with the same name, and a shared file makes one of them override the other.

A part is shared only inside one routine, and only when every role takes it unchanged.

## Generated files

Role files and rule files are generated from colocated `.list` files by `sh scripts/build-roles.sh`: the mechanism is the house rule `core/build-every-generated-file-from-its-list.md`. Generation is what lets a role share a part and still be one file to read. Never edit `references/` by hand. `Taskfile.yml` names the commands: `task build` runs the script, and `task gate`, which CI and `/cycle` run, also fails when a generated file was out of date. A routine's `references/` gets only the rule files its roles read. The build refuses orphans too: a rule in no list, a part no role uses, and a generated file no line builds, which is what a rule file is once the routine's roles stop reading it.

Kind files are generated the same way, from a routine's `skills/<routine>/kinds/kinds.list` — test-oracle is the routine that has kinds. A `kind <name> <parts>` line concatenates the parts, in order, into the generated and tracked `skills/<routine>/kinds/<name>.md`, which is never edited by hand; the parts are the files under `skills/<routine>/kinds/<name>/`. A part is a rule in the five-part format, and the part named `head` is exempt from the format check, as the index files are. The build refuses a kind part no line uses, and a kind line naming a part that is missing.

## The rule library

`skills/meridian/references/rules/` holds one rule per file, granular by single responsibility. Routines, and a reader of the `meridian` skill itself, read it as generated rule files, one per `rules-<name>.list`, each small enough to come back whole in one file read.

## Format of a rule

The format is the house rule `core/write-every-rule-in-the-five-part-format.md`, and `sh scripts/build-roles.sh` refuses a rule file that breaks it.

`core/rule-strength.md` says what Law, Default, Preference, and Tooling mean.
