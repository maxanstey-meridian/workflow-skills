---
name: meridian
description: Meridian house doctrine for backend/frontend architecture, domain invariants, concurrency, outcome-oriented UI and user journeys, testing, coding decisions, and tool defaults. Use when designing or reviewing invariant enforcement, transactions, races, locks, queues, outboxes, interfaces, forms, setup flows, module boundaries, ports and adapters, page composition roots, testing strategy, TypeScript defaults, generated-code boundaries, or repo tool choices.
---

# Meridian

Use this skill for Meridian-style engineering doctrine across backend, frontend, testing, and tooling.

## When to Use This Skill

- designing a new backend or frontend app
- reviewing whether a UI explains user outcomes rather than implementation details
- ordering forms, setup flows, and configuration screens around the user journey
- simplifying technical configuration into understandable user decisions
- reviewing whether an abstraction or seam is earned
- deciding where an invariant belongs or whether a race requires coordination
- checking ports-and-adapters / VSA boundaries
- deciding page composition root vs component/composable ownership
- choosing testing strategy
- deciding whether generated code should be wrapped
- checking whether a repo matches Meridian tool defaults

## How to Use It

The doctrine is a library of rule files under `references/rules/`, one rule per file. Every rule file has the same five parts: a `##` title that states the rule, a strength line (`**Law:**`, `**Default:**`, `**Preference:**`, or `**Tooling:**`) with the rule in one sentence, a `**When:**` line, and a `Bad:` and `Good:` pair. A rule may end with a `Links:` line that says where to read more. A file is named after its title. Read the folders the task touches:

- `references/rules/core/`: the indexes of the Laws, Defaults, and Preferences, and what each rule strength means
- `references/rules/coding/`: rules every stack shares: root causes and gaps, libraries before hand-rolled machinery, abstractions, naming, type safety, and review
- `references/rules/invariants/`: invariant ownership, deciders, recording invariants (INVARIANTS.md), concurrency, transactions, locks, queues, and outboxes
- `references/rules/backend/`: backend structure, module boundaries, ports and adapters, use cases, results and errors, validation, security, and scheduled work
- `references/rules/frontend/`: frontend structure, page composition roots, provide/inject, ports, composables, and presentational components
- `references/rules/ui/`: outcome-oriented UI, information hierarchy, form journeys, progressive disclosure, and accessibility, formatting, or validation details the spec leaves open
- `references/rules/tests/`: what to test, at which level, with which test doubles, and where tests live
- `references/rules/rivet/`: Rivet: the .NET server's transport contracts and endpoints, Azure Functions, and the TypeScript client package UIs consume
- `references/rules/tools/`: tool choices and config defaults for TS and .NET, running Plumb, and the commit and version convention

## Core Rules

The Laws are `references/rules/core/laws.md` (cross-stack), `references/rules/core/backend-laws.md`, and `references/rules/core/frontend-laws.md`; read the cross-stack file first, then the file for each stack the task touches. The Defaults are split the same way, in `references/rules/core/defaults.md`, `references/rules/core/backend-defaults.md`, and `references/rules/core/frontend-defaults.md`. Preferences are in `references/rules/core/preferences.md`, and `references/rules/core/rule-strength.md` says what a law, a default, a preference, and a tooling rule each mean. Those seven Laws, Defaults, and Preferences files are indexes that `sh scripts/build-roles.sh` generates from each rule's strength line: each line gives a rule's title, its one sentence, and the file that holds it. Change a rule's strength in the rule, never in an index.

## Mechanical Checking

Plumb's rules start at `references/rules/tools/run-plumb-only-where-the-repo-uses-it.md`; the other `references/rules/tools/` files with `plumb` in their names follow it.

## Notes

- For backend/frontend structure, do not restate generic clean architecture from scratch; use the Meridian references directly.
- For testing and coding questions, prefer the doctrine here over generic framework advice.
- AGENTS.md is the workflow-skills shared rules file your agent loads as its rules, not the repo's own AGENTS.md.
- The routines' subagents read these rules as generated files, each rule in exactly one: `references/rules-<name>.list` names a file's rules, and `sh scripts/build-roles.sh` in the workflow-skills repo concatenates each into the tracked `rules-<name>.md` in every routine's `references/` folder. A new rule goes in one list. After editing a rule or a list, run the script: it also refuses a rule file that breaks the format.
