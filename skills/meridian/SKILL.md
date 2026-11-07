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

The doctrine is a library of rule files under `references/rules/`, one rule per file, each opening with its `##` heading. Read the folders the task touches:

- `references/rules/core/`: the Laws, Defaults, Preferences, and what each rule strength means
- `references/rules/coding/`: cross-cutting coding doctrine, TypeScript and C# defaults, seam discipline, review discipline
- `references/rules/invariants/`: invariant ownership, deciders, recording invariants (INVARIANTS.md), concurrency, transactions, locks, queues, outboxes, and when scheduled work runs
- `references/rules/backend/`: backend structure, module boundaries, ports/adapters
- `references/rules/frontend/`: frontend structure, page composition roots, provide/inject, dumb views
- `references/rules/ui/`: outcome-oriented UI, information hierarchy, form journeys, progressive disclosure, and accessibility, formatting, or validation details the spec leaves open
- `references/rules/tests/`: testing defaults and mock/fake bias
- `references/rules/rivet/`: Rivet backend doctrine for `.NET` contracts, minimal APIs, controllers, and transport-edge patterns
- `references/rules/tools/`: tool choices and config defaults for TS and .NET, and Plumb
- `references/rules/workflow/`: the critic procedure the routines' critic subagents follow

## Core Rules

The Laws are `references/rules/core/laws.md`; read them first. Defaults and Preferences are beside it, in `references/rules/core/defaults.md` and `references/rules/core/preferences.md`, and `references/rules/core/rule-strength.md` says what a law, a default, a preference, and a tooling rule each mean.

## Mechanical Checking

Plumb's rule is `references/rules/tools/plumb.md`.

## Notes

- For backend/frontend structure, do not restate generic clean architecture from scratch; use the Meridian references directly.
- For testing and coding questions, prefer the doctrine here over generic framework advice.
- AGENTS.md is the workflow-skills shared rules file your agent loads as its rules, not the repo's own AGENTS.md.
- The routines read these rules as bundles: each routine lists the rules each of its roles reads in `skills/<routine>/references/bundles/<role>.list`, and `sh scripts/build-bundles.sh` concatenates each list into the tracked `<role>.md` beside it. After editing a rule or a list, run it in the workflow-skills repo.
