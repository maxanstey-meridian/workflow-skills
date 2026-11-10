# Slop and its signs

You are one subagent in a `/slop-hunt`. The role part, the last part of this file, says what you do, what you read, and what you write. Your brief names a hunt folder. Its `areas.md` starts with a `Root: <path>` line: that is the repository. Run git as `git -C "<Root>" …`. Don't read earlier hunts or review docs, so they don't steer you. You edit nothing but your own report. You run no build, test, or gate, and never commit, stage, or publish.

## What slop is

Slop is weight the code hasn't earned: code, machinery, or whole capabilities that cost more to own than they give the people who use the product. It comes in two kinds, and a hunt reports both:

- **Code weight:** code that can go, or be replaced by something the platform, a library, or the repo already provides, with no change in what the product does. Dead code, duplication, hand-rolled commodity machinery, and defensive bloat live here.
- **Design weight:** a capability, subsystem, option, diagnostic, or error path whose cost is out of line with what it gives users. Removing or reshaping it changes behaviour, and the finding says exactly what users lose. Over-engineering mostly lives here, so it's never a lesser kind of finding.

Most of the code a hunt reads was written by agents, quickly. Consistency is cheap for an agent, so "it's done the same way everywhere" proves nothing about whether it should be done at all. The baseline is house doctrine, the platform, and the libraries the repo already depends on, never the repo's own habits. A pattern the repo repeats is judged on its weight like anything else, as one finding with every place it's used counted.

## Proven and judgement

- **proven:** the code shows it. Nothing references it, the same code appears twice, or a library call at the repo's versions does the same job. The proof is mechanical.
- **judgement:** an argument about cost and value. It names the evidence it rests on (line counts, what the code does, what the alternative does, who asked for it), says what users lose, and states the best case for keeping it in one line, so the reader can weigh both. It isn't a weaker finding; it's checked differently.

## Signs, the proof each needs, and what not to flag

**1. Hand-rolled machinery** (a house Law): queues, outboxes, retries, timeouts, scheduling, locking, leases, caching, serialisation, parsing a standard format, identifier quoting, options validation, type mapping, reflection over metadata the framework already has, and dev tooling (diffing, comparison, test harnesses).
- *Proof:* the nearest maintained replacement at the repo's framework and package versions (a framework feature, a library the repo already depends on, house doctrine furniture, or a new dependency; say which), and the **delta**: each thing the custom code does that the replacement doesn't. For each item in the delta, say whether a stated requirement calls for it (the repo's instructions, a spec, or a test that pins a user-facing need) and whether it could sit as a small extension on top of the replacement. The custom code carries the burden of proof. "No library does exactly this" never dismisses a lead; it starts the delta list. The finding is proven when the replacement covers everything, and judgement when it argues the delta isn't worth its lines.
- *A design that rules every library out* (every statement must be hand-written so a checker can see it; a payload format no library reads) is itself a finding under sign 13, priced at the machinery it forces.
- *Don't flag:* the domain rules themselves (what a retention period means, who may approve a case). Product logic is the rules, not the machinery that carries them.

**2. Silent failure:** a broad `catch` that logs and continues; an error turned into `null`, `false`, an empty list, or a default; `?? fallback` that hides state that should never be missing; fallback branches nobody asked for; exception → result → exception round trips; retries around work that isn't idempotent; fire-and-forget `Task`s, unawaited promises, and `async void` outside event handlers.
- *Proof:* name the failure that gets lost, and what the caller sees instead.
- *Don't flag:* a specific catch that acts on the failure; the app's top-level error boundary (middleware, an error page); degradation the domain names on purpose. One that loses data or hides a failed write is a bug, not slop: one line under Also noticed, marked `data loss`.

**3. Defensive bloat:** null checks on non-nullable or already-validated values; the same rule validated again in several layers; guards on code that only internal callers reach; clamps and saturation for inputs validation already refuses.
- *Proof:* the upstream guarantee that makes it dead: the type, the validator at the boundary, or the database constraint, by `file:line`.
- *Don't flag:* trust boundaries (HTTP input, deserialisation, message consumers, external API responses, a host's implementation of a published port); domain invariants a use case or aggregate enforces (`invariants/enforce-an-invariant-at-its-authoritative-boundary.md`); database constraints. Nor an application check that turns a database constraint or a later failure into a declared result or a better error (the constraint stays the authority).

**4. Speculative abstraction:** an interface with one implementation and none of house doctrine's seam reasons (variability, runtime boundary, ownership boundary, testability, cross-module dependency); a factory, strategy, or registry for two or three cases a `switch` would hold; a base class whose subclasses only supply constants; forwarding wrappers; a library or generated client wrapped one-for-one; a generic repository or unit of work over a `DbContext`; an in-process mediator with nothing in its pipeline; a custom logging facade over `ILogger<T>`; a "Core" with thin shells around it; a config option or flag that's never set to a second value.
- *Proof:* the implementations, callers, or values, counted across the whole repo. For a config value, the deployment config too (appsettings per environment, Bicep or Terraform, pipelines, and the live settings where they can be read, `az` included); without that, the finding is risk high.
- *Don't flag:* a port at the Infrastructure edge that `backend/keep-a-port-narrow-and-capability-shaped.md` (or `frontend/shape-a-port-around-operations-not-dtos.md`) calls for; a seam that a test fake or a second host actually uses.

**5. Duplication (WET):** the same query, mapping, DTO shape, helper, constant, rule, or pipeline written twice or more; a UI re-deriving a rule the server decides (a house Law); hand-written TypeScript types or fetch wrappers mirroring server DTOs where a generated client or contract exists; in Vue, a `watch` that copies state into a `ref` where a `computed` would derive it.
- *Proof:* every location, and the reason they'd change together: would a change to one need the same change in the others? A commit that changed them together is the best evidence.
- *Don't flag:* coincidental likeness; three similar lines (`coding/extract-a-helper-only-after-the-pattern-repeats.md`); per-slice code that vertical slices keep local on purpose (`coding/keep-code-local-until-it-is-shared.md`).

**6. Dead code:** unused types, members, parameters, options, endpoints, files, and dependencies; commented-out code; flags that are always on; code used only by its own tests; code that runs but changes nothing (a value computed and never read, a call whose result is dropped and that has no side effect).
- *Proof:* no references anywhere in the repo, including the ones a symbol search misses: reflection, DI assembly scanning, serialisation, config binding, string names, and framework conventions. In Nuxt that means file-based routing (`pages/`, `server/api/`, `middleware/`, `plugins/`, `layouts/`) and auto-imported components by their path-derived name (`components/case/Header.vue` is `<CaseHeader>` or `<case-header>`). For a dependency, no import or `using` of it.
- *Consumers outside the repo:* an HTTP endpoint, a message contract, a config key, a database view, or a stored procedure may be used by something the repo can't see. Unused in code is then risk high, and the proof names what was checked (gateway or access logs, telemetry, the bus, other repos), or says nothing outside was checked.
- *Persisted shapes:* an EF-mapped property, or a DTO or enum member that gets serialised, is a column or a wire field. Removing it needs a migration or a contract change: say which, and it's never risk low.
- *Published API:* a public type or member of a published project or package isn't dead because nothing in the repo calls it, since consumers live elsewhere. Report it as `unused in repo; public API`, risk high, and say what removing it breaks. What counts as published: a project counts when it explicitly sets `IsPackable` true or `GeneratePackageOnBuild` in its project file or `Directory.Build.props`, or when a CI pack, push, or publish step names it (`dotnet pack`, `nuget push`, `npm publish`). The SDK default doesn't count, because `IsPackable` defaults to true for non-test projects. A `package.json` with `publishConfig` counts; one merely missing `"private": true` doesn't.

**7. Compat for consumers we own:** deprecated overloads, shims, toggles for dead paths, schema-version keys, and readers for old data shapes.
- *Proof:* every consumer of it is in this repo or is the team's own.
- *Don't flag:* a published package's deprecations kept under its versioning rules.

**8. Type escapes:** in TypeScript, `x as T`, `<T>x`, and `x!` that quiet the compiler (a house Law); on any stack, `any`, `object`, or `dynamic` carrying values, and `unknown` outside a parse boundary, C# `object?`, and `Record<string, unknown>` or `Dictionary<string, object>` where the keys are known; reflection (`MethodInfo.Invoke`, `MakeGenericType`) where the caller already holds the static type (`coding/model-the-real-type-of-every-value.md`).
- *Proof:* the real type the value has, and where it comes from.
- *Don't flag:* `as const`, `satisfies`, or genuinely dynamic data (user-supplied key-value pairs, opaque JSON from an external API); in C#, `= null!` or `default!` on EF entity and options properties, which is the framework's idiom.

**9. Ceremony and noise:** comments that restate the code, or no longer match it; doc comments that repeat the signature or narrate history; logging that narrates the happy path; `async` with nothing to await; mapping layers that copy fields one-to-one; records that only carry a value from one call to the next; vague names (`Manager`, `Helper`, `Service`, `Support`, `utils`) as dumping grounds; barrel re-exports that hide where things live.
- *Portability test:* a comment or name that could move unchanged into an unrelated project carries no information about this one.
- *Don't flag:* comments that say why; doc comments on a published package's public API that a consumer needs; logging at a boundary that ops relies on.

**10. Test slop:** a check that can't fail (it asserts the mock, compares output with its own input, or passes with the code deleted); a test that mocks the unit it claims to test; `UseInMemoryDatabase` or another fake engine where house doctrine requires the production one (a Law, `tests/run-adapter-tests-on-the-production-database-engine.md`); duplicate tests; snapshot sprawl; test hooks in production code; config that switches checks off for code it was never meant for (an analyzer or lint rule scoped too wide).
- *Proof:* name the code change that would make the test or check fail, or say "none".
- *A test of live code that can't fail* is a finding like any other, with "replace with a test that pins <behaviour>". It can be deleted only when the behaviour itself is being removed (dead code with its own tests, or a design finding the user agrees to), or when another named test already pins *that behaviour* (by `file:line`).
- *A duplicate test* can be deleted only when the kept test fails for every break the deleted one fails for.
- *Any other test slop:* replace, never delete.
- A test slop finding never also removes the code that test covers: they're separate findings, and the code's proof can't count on the test that is being replaced.
- *Don't flag:* tests that mock real external dependencies while running the real logic.

**11. Out of proportion:** files, functions, or capabilities far bigger than the job they do.
- *Proof:* the line count, the job in one sentence, and the smaller shape that does that job. Moving code to another file removes nothing, so a split alone isn't the fix; what can go is.

**12. Dependency sprawl:** two libraries for one job (two HTTP clients, two date libraries, two mappers); a package for something the platform does in a line.
- *Proof:* where each is used, and which one the house shape (the libraries by job, in the design report or the single hunter's report) or the repo's instructions name.

**13. Unearned capability** (design weight): a capability, subsystem, option, diagnostic, or error path whose cost is out of line with what it gives users. Look for:
- polish nobody asked for: a hand-built excerpt or diagnostic in an error message, a config knob with one sensible value, a report nobody reads;
- a job that belongs to someone else: the host, the caller, the database, or a library the host already has (a durable queue inside a library whose hosts run their own, a serialisation format built so a public API can accept anything);
- a capability built for a case no user has, or no user has asked about;
- a design decision whose cost spreads: every later piece must be hand-rolled, or checked twice, to fit it.
- *Proof:* its cost, counted (lines, files, types, tests, and the machinery it forces elsewhere); what it gives users, in one sentence; the cheaper shape (drop it, hand it to the host, caller, or a library, or a smaller design); what users lose; and who asked for it (the spec Decision, issue, or commit, or "nobody recorded"). Always judgement. The risk follows what users lose.
- *Don't flag:* a capability the product exists to provide, at the size its users need it.

## Not slop

Leave these out of the report:

- a guard at a trust boundary, an authorization check, or a domain invariant's enforcement (the machinery around it can still be slop);
- migrations and generated code (judge the generator's configuration instead, if that's in the area);
- thresholds someone tuned by measurement, and assertions that could be tighter but already cover the behaviour (`coding/leave-harmless-redundancy-out-of-review-findings.md`);
- taste: a name or a layout another reader would have chosen differently, when theirs would weigh no less.
