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

The doctrine is in six rule files in `references/`. Read `references/rules-core.md` first, for every task, in full. Then read, in full, the file for each area the task touches:

- `references/rules-core.md`: the Laws, what each rule strength means, and the rules every stack shares: root causes and gaps, libraries before hand-rolled machinery, abstractions, naming, type safety, review, tool choices every stack shares, running Plumb, and the commit and version convention
- `references/rules-invariants.md`: invariant ownership, deciders, recording invariants (INVARIANTS.md), concurrency, transactions, locks, queues, and outboxes
- `references/rules-backend.md`: the Backend Laws, backend structure, module boundaries, ports and adapters, use cases, results and errors, validation, security, and scheduled work
- `references/rules-backend-tooling.md`: the .NET and TypeScript backend tool defaults, and Rivet: the .NET server's transport contracts and endpoints, and Azure Functions
- `references/rules-frontend.md`: the Frontend Laws, frontend structure, page composition roots, provide/inject, ports, composables, presentational components, outcome-oriented UI, information hierarchy, form journeys, progressive disclosure, accessibility, formatting, or validation details the spec leaves open, and the Rivet TypeScript client package UIs consume
- `references/rules-tests.md`: what to test, at which level, with which test doubles, and where tests live

Each file ends with a line `<!-- end of … -->`; if your read stopped before that line, read on from where it stopped.

Every rule is in exactly one of the six files, under a `<!-- rule: <path> -->` line, and has the same five parts: a `##` title that states the rule, a strength line (`**Law:**`, `**Default:**`, `**Preference:**`, or `**Tooling:**`) with the rule in one sentence, a `**When:**` line, and a `Bad:` and `Good:` pair. A rule may end with a `Links:` line that says where to read more. A rule cited by its path, such as `invariants/never-blindly-retry-a-non-idempotent-operation.md`, sits under the line that names that path.

## Core Rules

The Laws open three of the files: the cross-stack Laws open `references/rules-core.md`, the Backend Laws open `references/rules-backend.md`, and the Frontend Laws open `references/rules-frontend.md`. Each is an index that `sh scripts/build-roles.sh` generates from each rule's strength line: each line gives a rule's title, its one sentence, and its path. A Default, a Preference, and a Tooling rule each carry their strength on their own strength line, and the rule `core/rule-strength.md`, in `references/rules-core.md`, says what each strength means. Change a rule's strength in the rule, never in an index.

## Mechanical Checking

Plumb's rules are in `references/rules-core.md`, starting at the rule `tools/run-plumb-only-where-the-repo-uses-it.md`; the other rules there with `plumb` in their paths follow it.

## Notes

- For backend/frontend structure, do not restate generic clean architecture from scratch; use the Meridian references directly.
- For testing and coding questions, prefer the doctrine here over generic framework advice.
- AGENTS.md is the workflow-skills shared rules file your agent loads as its rules, not the repo's own AGENTS.md.
- The six rule files are generated: `references/rules-<name>.list` names a file's rules, and `sh scripts/build-roles.sh` in the workflow-skills repo concatenates each into the tracked `rules-<name>.md` here and in every routine's `references/` folder, where the routines' subagents read them. A new rule is written under `references/rules/` and goes in one list. After editing a rule or a list, run the script: it also refuses a rule file that breaks the format.
