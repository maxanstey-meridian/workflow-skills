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

The doctrine is a library under `references/rules/` of rule files, one rule per file, and design documents, each holding every section of one design and read whole, named by path below. Every file opens with its `##` heading. Read the folders the task touches:

- `references/rules/core/`: the Laws, Defaults, Preferences, and what each rule strength means
- `references/rules/coding/`: cross-cutting coding doctrine, TypeScript and C# defaults, seam discipline, review discipline
- `references/rules/invariants/`: invariant ownership, deciders, recording invariants (INVARIANTS.md), concurrency, transactions, locks, queues, outboxes, and when scheduled work runs
- `references/rules/backend/`: backend structure, module boundaries, ports/adapters (module layout: `backend/module-layout.md`)
- `references/rules/frontend/`: frontend structure, page composition roots, provide/inject, dumb views (page ports and adapters: `frontend/page-ports-and-adapters.md`)
- `references/rules/ui/`: outcome-oriented UI, information hierarchy, form journeys, progressive disclosure, and accessibility, formatting, or validation details the spec leaves open
- `references/rules/tests/`: testing defaults and mock/fake bias
- `references/rules/rivet/`: Rivet: the .NET server shape (`rivet/server-shape.md`), Azure Functions, and the TypeScript client package UIs consume (`rivet/client-package.md`)
- `references/rules/tools/`: tool choices and config defaults for TS and .NET, Plumb, and the commit and version convention
- `references/rules/workflow/`: the critic and auditor procedures the routines' subagents follow

## Core Rules

The Laws are `references/rules/core/laws.md` (cross-stack), `references/rules/core/backend-laws.md`, and `references/rules/core/frontend-laws.md`; read the cross-stack file first, then the file for each stack the task touches. The Defaults are split the same way, in `references/rules/core/defaults.md`, `references/rules/core/backend-defaults.md`, and `references/rules/core/frontend-defaults.md`. Preferences are in `references/rules/core/preferences.md`, and `references/rules/core/rule-strength.md` says what a law, a default, a preference, and a tooling rule each mean.

## Mechanical Checking

Plumb's rule is `references/rules/tools/plumb.md`.

## Notes

- For backend/frontend structure, do not restate generic clean architecture from scratch; use the Meridian references directly.
- For testing and coding questions, prefer the doctrine here over generic framework advice.
- AGENTS.md is the workflow-skills shared rules file your agent loads as its rules, not the repo's own AGENTS.md.
- The routines read these rules as bundles: each routine lists the rules each of its roles reads in `skills/<routine>/references/bundles/<role>.list`, and `sh scripts/build-bundles.sh` concatenates each list into the tracked `<role>.md` beside it. After editing a rule or a list, run it in the workflow-skills repo.
