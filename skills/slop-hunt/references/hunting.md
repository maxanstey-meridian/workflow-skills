# Hunting an area

Read this before you hunt. You're one reader in a `/slop-hunt`: you read part of a codebase, find the weight it hasn't earned, and argue each finding. You edit nothing but your report, and run no build, test, or gate.

## What slop is

Slop is weight the code hasn't earned: code, machinery, or whole capabilities that cost more to own than they give the people who use the product. It comes in two kinds, and you report both:

- **Code weight:** code that can go, or be replaced by something the platform, a library, or the repo already provides, with no change in what the product does. Dead code, duplication, hand-rolled commodity machinery, and defensive bloat live here.
- **Design weight:** a capability, subsystem, option, diagnostic, or error path whose cost is out of line with what it gives users. Removing or reshaping it changes behaviour, and the finding says exactly what users lose. Over-engineering mostly lives here, so it's never a lesser kind of finding.

Most of the code you read was written by agents, quickly. Consistency is cheap for an agent, so "it's done the same way everywhere" proves nothing about whether it should be done at all. The baseline is house doctrine, the platform, and the libraries the repo already depends on, never the repo's own habits. A pattern the repo repeats is judged on its weight like anything else, as one finding with every place it's used counted.

## How to read

In `coding/review-discipline.md`, "Suppress noise" applies to a hunt, and the rest governs reviews of a change.

- **Argue every finding, and say which kind it is.**
  - **proven:** the code shows it. Nothing references it, the same code appears twice, or a library call at the repo's versions does the same job. The proof is mechanical.
  - **judgement:** an argument about cost and value. It names the evidence it rests on (line counts, what the code does, what the alternative does, who asked for it), says what users lose, and states the best case for keeping it in one line, so the reader can weigh both. It isn't a weaker finding; it's checked differently.

  A finding you can't argue either way stays out. Never pad the list with what's easy to prove: a ten-line cleanup that's certain matters less than a 500-line subsystem that's doubtful, and the ranking says so.
- **Weigh before you read lines.** Before you go file by file, write down what each piece of your area is for and how many lines it takes (your brief gives sizes). Ask of each: what does it give users, what's the cheapest shape that gives them that (the platform, a library, the host's or caller's job, a smaller design, or nothing), and what would they lose? Then read every file in full, and let what you read confirm or overturn the weighing. This goes in your report's weight map.
- **Follow the work, not the folder.** Start at the entry points (endpoints, message handlers, jobs, pages), follow one request down to persistence, then read what's left. Slop shows up as a layer the request passes through without anything happening to it, and as machinery that exists to serve other machinery.
- **Search the whole repo, not just your area,** before you claim that something is duplicated, unused, or missing (Dead code lists what a symbol search misses).
- **Read every file in your brief in full.** No skimming, sampling, or reading signatures in place of bodies. If you run out of room before you've read them all, say which files you didn't read; never list a file you didn't read in full as read.
- **Ask two questions of every finding.** *Necessity:* what breaks if this goes? Name the behaviour a user would see, or say "nothing". "A test fails" isn't a behaviour. An error message's wording, or an edge no real user meets, does count, but say it plainly so it can be weighed. *History:* why is it here? `git log -L <start>,<end>:<file> -s --format='%h %as %s'` lists the commits that touched those lines; `git show <hash>` reads the one that matters. Cite its hash when the lines are a guard or a copy. A guard that a bug-fix commit added is a fence: say what replaces it, or show that the bug can no longer happen.
- **A recorded decision is evidence, not a verdict.** When a spec Decision, the repo's instructions, a doc, or a commit chose this shape, cite it. If the cost case still holds, report the finding as judgement and say which decision it reopens: the user decides. "The repo chose this" never ends the argument by itself.
- **Name what still protects it.** A protection is whatever stops a behaviour from breaking unnoticed: a test, a guard, a validator, a constraint, or a type. A finding that removes or weakens one names, by `file:line`, what still protects that behaviour afterwards, and that successor must not itself be something you're flagging. When nothing does and the behaviour is meant to stay, it isn't slop. A design finding that drops a behaviour on purpose names the tests that pin it instead: they change with it. When one finding is only true once another lands (B is dead only once A goes), report them as one finding.
- **Don't hunt bugs.** You're looking for weight, not defects. A bug you trip over gets one line under Also noticed (below), with its `file:line`, and no proof, history, or fix work. Don't go looking for more. A broken house Law that a sign below covers isn't a bug for this purpose: it's a finding under that sign, with its proof.
- **Leads aren't findings.** A knip, jscpd, or analyzer hit is a place to read, and so is a design lead from the hunt's design reader. A lead becomes a finding only once you've checked it against the code. When a design lead covers code in your area, add what you see there to it (confirm it, price it more exactly, or contradict it, citing `file:line`) rather than reporting the same thing again.

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
- *Don't flag:* trust boundaries (HTTP input, deserialisation, message consumers, external API responses, a host's implementation of a published port); domain invariants a use case or aggregate enforces (`invariants/invariant-enforcement.md`); database constraints. Nor an application check that turns a database constraint or a later failure into a declared result or a better error (the constraint stays the authority).

**4. Speculative abstraction:** an interface with one implementation and none of house doctrine's seam reasons (variability, runtime boundary, ownership boundary, testability, cross-module dependency); a factory, strategy, or registry for two or three cases a `switch` would hold; a base class whose subclasses only supply constants; forwarding wrappers; a library or generated client wrapped one-for-one; a generic repository or unit of work over a `DbContext`; an in-process mediator with nothing in its pipeline; a custom logging facade over `ILogger<T>`; a "Core" with thin shells around it; a config option or flag that's never set to a second value.
- *Proof:* the implementations, callers, or values, counted across the whole repo. For a config value, the deployment config too (appsettings per environment, Bicep or Terraform, pipelines, and the live settings where you can read them, `az` included); without that, the finding is risk high.
- *Don't flag:* a port at the Infrastructure edge that `backend/ports-and-adapters.md` (or `frontend/page-ports-and-adapters.md`) calls for; a seam that a test fake or a second host actually uses.

**5. Duplication (WET):** the same query, mapping, DTO shape, helper, constant, rule, or pipeline written twice or more; a UI re-deriving a rule the server decides (a house Law); hand-written TypeScript types or fetch wrappers mirroring server DTOs where a generated client or contract exists; in Vue, a `watch` that copies state into a `ref` where a `computed` would derive it.
- *Proof:* every location, and the reason they'd change together: would a change to one need the same change in the others? A commit that changed them together is the best evidence.
- *Don't flag:* coincidental likeness; three similar lines (`coding/coding-style.md`, "Let patterns prove themselves"); per-slice code that vertical slices keep local on purpose (`coding/local-before-shared.md`).

**6. Dead code:** unused types, members, parameters, options, endpoints, files, and dependencies; commented-out code; flags that are always on; code used only by its own tests; code that runs but changes nothing (a value computed and never read, a call whose result is dropped and that has no side effect).
- *Proof:* no references anywhere in the repo, including the ones a symbol search misses: reflection, DI assembly scanning, serialisation, config binding, string names, and framework conventions. In Nuxt that means file-based routing (`pages/`, `server/api/`, `middleware/`, `plugins/`, `layouts/`) and auto-imported components by their path-derived name (`components/case/Header.vue` is `<CaseHeader>` or `<case-header>`). For a dependency, no import or `using` of it.
- *Consumers outside the repo:* an HTTP endpoint, a message contract, a config key, a database view, or a stored procedure may be used by something the repo can't see. Unused in code is then risk high, and the proof names what you checked (gateway or access logs, telemetry, the bus, other repos), or says nothing outside was checked.
- *Persisted shapes:* an EF-mapped property, or a DTO or enum member that gets serialised, is a column or a wire field. Removing it needs a migration or a contract change: say which, and it's never risk low.
- *Published API:* a public type or member of a published project or package (your brief says which are) isn't dead because nothing in the repo calls it, since consumers live elsewhere. Report it as `unused in repo; public API`, risk high, and say what removing it breaks.

**7. Compat for consumers we own:** deprecated overloads, shims, toggles for dead paths, schema-version keys, and readers for old data shapes.
- *Proof:* every consumer of it is in this repo or is the team's own.
- *Don't flag:* a published package's deprecations kept under its versioning rules.

**8. Type escapes:** in TypeScript, `x as T`, `<T>x`, and `x!` that quiet the compiler (a house Law); on any stack, `any`, `object`, or `dynamic` carrying values, and `unknown` outside a parse boundary, C# `object?`, and `Record<string, unknown>` or `Dictionary<string, object>` where the keys are known; reflection (`MethodInfo.Invoke`, `MakeGenericType`) where the caller already holds the static type (`coding/type-safety-all-stacks.md`).
- *Proof:* the real type the value has, and where it comes from.
- *Don't flag:* `as const`, `satisfies`, or genuinely dynamic data (user-supplied key-value pairs, opaque JSON from an external API); in C#, `= null!` or `default!` on EF entity and options properties, which is the framework's idiom.

**9. Ceremony and noise:** comments that restate the code, or no longer match it; doc comments that repeat the signature or narrate history; logging that narrates the happy path; `async` with nothing to await; mapping layers that copy fields one-to-one; records that only carry a value from one call to the next; vague names (`Manager`, `Helper`, `Service`, `Support`, `utils`) as dumping grounds; barrel re-exports that hide where things live.
- *Portability test:* a comment or name that could move unchanged into an unrelated project carries no information about this one.
- *Don't flag:* comments that say why; doc comments on a published package's public API that a consumer needs; logging at a boundary that ops relies on.

**10. Test slop:** a check that can't fail (it asserts the mock, compares output with its own input, or passes with the code deleted); a test that mocks the unit it claims to test; `UseInMemoryDatabase` or another fake engine where house doctrine requires the production one (a Law, `tests/test-substrate.md`); duplicate tests; snapshot sprawl; test hooks in production code; config that switches checks off for code it was never meant for (an analyzer or lint rule scoped too wide).
- *Proof:* name the code change that would make the test or check fail, or say "none".
- *A test of live code that can't fail* is a finding like any other, with "replace with a test that pins <behaviour>". It can be deleted only when the behaviour itself is being removed (dead code with its own tests, or a design finding the user agrees to), or when another named test already pins *that behaviour* (by `file:line`).
- *A duplicate test* can be deleted only when the kept test fails for every break the deleted one fails for.
- *Any other test slop:* replace, never delete.
- A test slop finding never also removes the code that test covers: they're separate findings, and the code's proof can't count on the test you're replacing.
- *Don't flag:* tests that mock real external dependencies while running the real logic.

**11. Out of proportion:** files, functions, or capabilities far bigger than the job they do.
- *Proof:* the line count, the job in one sentence, and the smaller shape that does that job. Moving code to another file removes nothing, so a split alone isn't the fix; what can go is.

**12. Dependency sprawl:** two libraries for one job (two HTTP clients, two date libraries, two mappers); a package for something the platform does in a line.
- *Proof:* where each is used, and which one the baseline names.

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
- migrations and generated code (judge the generator's configuration instead, if that's in your area);
- thresholds someone tuned by measurement, and assertions that could be tighter but already cover the behaviour (`coding/review-discipline.md`, "Suppress noise");
- taste: a name or a layout you'd have chosen differently, when yours would weigh no less.

## Your report

The report opens with the **weight map**: one line per piece of your area (a capability, a subsystem, or a cluster of files that does one job), `<what it's for> · <files> · <lines> · <earned | see #N or D<n>>`. A piece marked earned says in a few words what earns it.

Then one line per finding, most weight first:

`#N · <sign> · <proven | judgement> · file:line (+ other locations) [ · (uncommitted)] · what it is · replace with <the specific API, library, or existing repo code; "delete"; or "hand to <the host, the caller, or a library>"> · removes <what> · behaviour <none | what users lose> · risk low|med|high · proof <how you checked, and for a guard or a copy the commit hash for its history> · against <the best case for keeping it, in one line> · protected by <the build | the test, by name, that pins the behaviour and that no finding touches | the tests that change with it, for a behaviour the finding drops | none>`

The design reader numbers its findings `D1`, `D2`, and so on; area hunters number theirs `#1`, `#2`, and so on.

A finding that removes fewer than about ten lines and changes no behaviour is **cleanup**: list it after the findings under `Cleanup`, one short line each (`file:line · what · replace with`), not in the ranked lines.

Risk:

- **low**: a change the compiler or the type checker proves (an unreferenced private member, an unused import), or private or internal code whose behaviour a test pins: a test that names the symbol or drives its entry point, found by searching the tests.
- **med**: the change crosses files or layers, no test pins the behaviour it touches, or it changes behaviour that users would only see in an edge or an error message.
- **high**: a published package's public API, a consumer outside the repo, a persisted or wire shape, a behaviour change users would notice without being told, a behaviour edge (an error path, a fallback someone may rely on) that no test pins, or a deleted or weakened test of live code.

Add the optional `(uncommitted)` marker when the finding sits in one of the uncommitted files your brief lists.

Then **Also noticed**: bugs you tripped over, one line each (`file:line · what goes wrong`), marked `data loss` or `security` when they are, or `none`. Re-derived server rules, tests that can't fail, and any broken house Law a sign above covers aren't Also-noticed bugs: they're findings under their sign. Then the leads you checked and dropped, one line each with why; "no exact replacement" isn't a reason (sign 1). Then list any files in your brief you didn't read in full, and end with `Files read in full:` and the list; that last line marks the report complete. Facts and arguments only: one replacement per finding, and no options or asks.
