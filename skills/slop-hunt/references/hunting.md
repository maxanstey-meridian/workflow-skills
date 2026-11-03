# Hunting an area

Read this before you hunt. You're one hunter in a `/slop-hunt`: you read one area of a mature enterprise app, find code that can be deleted or replaced without changing what the app does, and prove each finding. You edit nothing but your report, and run no build, test, or gate.

## How to read an area

- **Precision over recall.** A finding the code's owner would rightly reject costs more than one you missed: it wastes their review and teaches them to skim your list. Every finding carries the proof its sign needs (below).
- **The house way is the baseline.** Your brief gives it (`baseline.md`). Before you flag something as odd, find two or three siblings that do the same job (other handlers, other pages, other repositories). If they all do it this way, it's the convention. A convention is slop only when it breaks a meridian Law or Default, and then it's one finding, with every place it's used counted.
- **Follow the work, not the folder.** Start at the entry points (endpoints, message handlers, jobs, pages), follow one request down to persistence, then read what's left. Slop shows up as a layer the request passes through without anything happening to it.
- **Search the whole repo, not just your area,** before you claim that something is duplicated, unused, or missing (Dead code lists what a symbol search misses).
- **Read in full the files your brief marks `full`.** For a `skim` file, read its symbols and signatures, and open a body only when a lead or a signature points there. Never claim to have reviewed a skimmed file.
- **Ask two questions of every finding.** *Necessity:* what breaks if this goes? Name the behaviour, or say "nothing". *History:* why is it here? `git log -L <start>,<end>:<file> -s --format='%h %as %s'` lists the commits that touched those lines; `git show <hash>` reads the one that matters. Cite its hash in the finding. A guard that a bug-fix commit added is a fence: say what replaces it, or leave it.
- **Name what still protects it.** A protection is whatever stops a behaviour from breaking unnoticed: a test, a guard, a validator, a constraint, or a type. A finding that removes or weakens one names, by `file:line`, what still protects that behaviour afterwards, and that successor must not itself be something you're flagging. If nothing does, it isn't slop. When one finding is only true once another lands (B is dead only once A goes), report them as one finding.
- **Don't hunt bugs.** You're looking for weight, not defects. A bug you trip over gets one line under Also noticed (below), with its `file:line`, and no proof, history, or fix work. Don't go looking for more.
- **Leads aren't findings.** A knip, jscpd, or analyzer hit is a place to read. It becomes a finding only once you've checked it to the standard below.

## Signs, the proof each needs, and what not to flag

**1. Hand-rolled machinery** (a meridian Law): retries, timeouts, scheduling, locking, caching, serialisation, identifier quoting, options validation, type mapping, reflection over metadata the framework already has, and dev tooling (diffing, comparison, parsers for standard formats, test harnesses).
- *Proof:* the exact replacement (`Microsoft.Extensions.Http.Resilience`'s `AddStandardResilienceHandler`, `ValidateDataAnnotations().ValidateOnStart()`, `Intl.RelativeTimeFormat`), present at the repo's framework and package versions, and doing what the custom code does (its failure, retry, and transaction behaviour). Say whether it's already a dependency, meridian furniture, or new.
- *Don't flag:* local product logic. Meridian's line is commodity machinery versus product logic, not large code versus small code. Nor code where the repo records the constraint that rules the library out.

**2. Silent failure:** a broad `catch` that logs and continues; an error turned into `null`, `false`, an empty list, or a default; `?? fallback` that hides state that should never be missing; fallback branches nobody asked for; exception → result → exception round trips; retries around work that isn't idempotent; fire-and-forget `Task`s, unawaited promises, and `async void` outside event handlers.
- *Proof:* name the failure that gets lost, and what the caller sees instead.
- *Don't flag:* a specific catch that acts on the failure; the app's top-level error boundary (middleware, an error page); degradation the domain names on purpose. One that loses data or hides a failed write is a bug, not slop: one line under Also noticed, marked `data loss`.

**3. Defensive bloat:** null checks on non-nullable or already-validated values; the same rule validated again in several layers; guards on code that only internal callers reach.
- *Proof:* the upstream guarantee that makes it dead: the type, the validator at the boundary, or the database constraint, by `file:line`.
- *Don't flag:* trust boundaries (HTTP input, deserialisation, message consumers, external API responses); domain invariants a use case or aggregate enforces (meridian `invariants-and-concurrency.md`); database constraints. Those are where the checks belong. Nor an application check that turns a database constraint or a later failure into a declared result or a better error (the constraint stays the authority).

**4. Speculative abstraction:** an interface with one implementation and none of meridian's seam reasons (variability, runtime boundary, ownership boundary, testability, cross-module dependency); a factory, strategy, or registry for two cases; forwarding wrappers; a library or generated client wrapped one-for-one; a generic repository or unit of work over a `DbContext`; an in-process mediator with nothing in its pipeline; a custom logging facade over `ILogger<T>`; a "Core" with thin shells around it; a generic base with one subclass; a config option or flag that's never set to a second value.
- *Proof:* the implementations, callers, or values, counted across the whole repo. For a config value, the deployment config too (appsettings per environment, Bicep or Terraform, pipelines, and the live settings where you can read them, `az` included); without that, the finding is risk high.
- *Don't flag:* a port at the Infrastructure edge that the `Ports and Adapters` section of `backend-pa-vsa.md` (or its frontend counterpart) calls for; a seam that a test fake or a second host actually uses.

**5. Duplication (WET):** the same query, mapping, DTO shape, helper, constant, or pipeline written twice or more; a UI re-deriving a rule the server decides (a meridian Law); hand-written TypeScript types or fetch wrappers mirroring server DTOs where a generated client or contract exists; in Vue, a `watch` that copies state into a `ref` where a `computed` would derive it.
- *Proof:* every location, and the reason they'd change together: would a change to one need the same change in the others?
- *Don't flag:* coincidental likeness; three similar lines (meridian, "Let patterns prove themselves"); per-slice code that vertical slices keep local on purpose (meridian, "Local Before Shared").

**6. Dead code:** unused types, members, parameters, options, endpoints, files, and dependencies; commented-out code; flags that are always on; code used only by its own tests; code that runs but changes nothing (a value computed and never read, a call whose result is dropped and that has no side effect).
- *Proof:* no references anywhere in the repo, including the ones a symbol search misses: reflection, DI assembly scanning, serialisation, config binding, string names, and framework conventions. In Nuxt that means file-based routing (`pages/`, `server/api/`, `middleware/`, `plugins/`, `layouts/`) and auto-imported components by their path-derived name (`components/case/Header.vue` is `<CaseHeader>` or `<case-header>`). For a dependency, no import or `using` of it.
- *Consumers outside the repo:* an HTTP endpoint, a message contract, a config key, a database view, or a stored procedure may be used by something the repo can't see. Unused in code is then risk high, and the proof names what you checked (gateway or access logs, telemetry, the bus, other repos), or says nothing outside was checked.
- *Persisted shapes:* an EF-mapped property, or a DTO or enum member that gets serialised, is a column or a wire field. Removing it needs a migration or a contract change: say which, and it's never risk low.
- *Don't flag as dead:* a public type or member of a published project or package (your brief says which are). Nothing in the repo calling it proves nothing, because consumers live elsewhere. Report it as `unused in repo; public API`, risk high, and say what removing it breaks.

**7. Compat for consumers we own:** deprecated overloads, shims, toggles for dead paths, schema-version keys, and readers for old data shapes (AGENTS.md, "No compat layers for consumers we own").
- *Proof:* every consumer of it is in this repo or is the team's own.
- *Don't flag:* a published package's deprecations kept under its versioning rules.

**8. Type escapes:** in TypeScript, `x as T`, `<T>x`, and `x!` that quiet the compiler (a meridian Law); on any stack, `any`, `object`, or `dynamic` carrying values, and `unknown` outside a parse boundary, C# `object?`, and `Record<string, unknown>` or `Dictionary<string, object>` where the keys are known (meridian `coding-philosophy.md`, Type Safety).
- *Proof:* the real type the value has, and where it comes from.
- *Don't flag:* `as const`, `satisfies`, or genuinely dynamic data (user-supplied key-value pairs, opaque JSON from an external API); in C#, `= null!` or `default!` on EF entity and options properties, which is the framework's idiom.

**9. Ceremony and noise:** comments that restate the code, or no longer match it; doc comments that repeat the signature; logging that narrates the happy path; `async` with nothing to await; mapping layers that copy fields one-to-one; vague names (`Manager`, `Helper`, `Service`, `utils`) as dumping grounds; barrel re-exports that hide where things live.
- *Portability test:* a comment or name that could move unchanged into an unrelated project carries no information about this one.
- *Don't flag:* comments that say why; doc comments on a published package's public API; logging at a boundary that ops relies on.

**10. Test slop:** a check that can't fail (it asserts the mock, compares output with its own input, or passes with the code deleted); a test that mocks the unit it claims to test; `UseInMemoryDatabase` or another fake engine where meridian requires the production one (a Law, `testing-philosophy.md`); duplicate tests; snapshot sprawl; test hooks in production code.
- *Proof:* name the code change that would make the test fail, or say "none".
- *A test of live code that can't fail* is a finding like any other, with "replace with a test that pins <behaviour>". It can be deleted only when the behaviour itself is being removed (dead code with its own tests), or when another named test already pins *that behaviour* (by `file:line`).
- *A duplicate test* can be deleted only when the kept test fails for every break the deleted one fails for.
- *Any other test slop:* replace, never delete.
- A test slop finding never also removes the code that test covers: they're separate findings, and the code's proof can't count on the test you're replacing.
- *Don't flag:* tests that mock real external dependencies while running the real logic.

**11. Out of proportion:** files or functions far bigger than the job they do.
- *Proof:* the line count, and the job in one sentence. The finding is the split or deletion that fixes it; size alone isn't a finding.

**12. Dependency sprawl:** two libraries for one job (two HTTP clients, two date libraries, two mappers); a package for something the platform does in a line.
- *Proof:* where each is used, and which one the house baseline names.

## Not slop

Leave these out of the report entirely:

- house conventions applied consistently that break no meridian Law or Default;
- authorization, trust-boundary validation, idempotency, concurrency guards, timeouts on external calls, and migrations;
- generated code (judge its generator's configuration instead, if that's in your area);
- harmless redundancy that aids reading, thresholds someone tuned by measurement, and assertions that could be tighter but already cover the behaviour (meridian, "Suppress noise");
- taste: a name or a layout you'd have chosen differently.

## Your report

The report's first line is `HEAD <short hash>`, the HEAD of your area's repo (your brief gives it). Then one line per finding, most impactful first:

`#N · <sign> · file:line (+ other locations) [ · (uncommitted)] · what it is · replace with <the specific API, library, or existing repo code, or "delete"> · removes <what> · risk low|med|high · proof <how you checked, and the commit hash for its history> · protected by <the build | the test, by name, that pins the behaviour and that no finding touches | none> · lead <finder, or none>`

Risk:

- **low**: a change the compiler or the type checker proves (an unreferenced private member, an unused import), or private or internal code whose behaviour a test pins: a test that names the symbol or drives its entry point, found by searching the tests.
- **med**: the change crosses files or layers, or no test pins the behaviour it touches.
- **high**: a published package's public API, a consumer outside the repo, a persisted or wire shape, a behaviour edge (an error path, a fallback someone may rely on) that no test pins, or a deleted or weakened test of live code.

Add the optional `(uncommitted)` marker when the finding sits in one of the uncommitted files your brief lists.

Then **Also noticed**: bugs you tripped over, one line each (`file:line · what goes wrong`), marked `data loss` or `security` when they are, or `none`. Re-derived server rules and tests that can't fail aren't bugs: they're signs 5 and 10, and go in the ranked list. Then the leads you checked and dropped, one line each with why. List the files you read, then end with `Files read: <n>/<marked full> in full, <n> skimmed`; that last line marks the report complete. Facts only: one replacement per finding, and no options, recommendations, or asks.
