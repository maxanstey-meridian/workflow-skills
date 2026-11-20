# Kind: browser-behaviour

The doctrine for cases whose rows are things a person does in a browser. It adds to `SKILL.md` for this kind only: what a row is, where its intent comes from, what a browser test may and may not do, how the disprover handles a claim about a page, what to sweep, and how the tests run. Everything `SKILL.md` already holds — the loop, the records, the ledger, citations, verdict gating, the `Source` order and its five words, the question mechanism, and where a case stands — stays as it is.

## What a row is

A row is a response the app's declared contract declares that a person can cause from the app's pages: every write that succeeds, and every way of being turned away. The frontend is read for exactly two things: which page reaches an operation, and what a person does there to cause the row, the row's `When`. A check the page makes itself (a schema, a required box, a limit) is never a row, and never a source for what the person should see. A row no person can cause from a page carries its cited chain in `CantHappen`. A browser that turns a person away with no test driving it is an accepted gap, not a row and not a finding.

## Where intent comes from

The `Source` order is the one `SKILL.md` holds; for this kind, a row's `Expected` cites among these:

- the app's declared contract, in whatever form the repo declares it — a `written` source;
- the frontend's consumers of it: which pages reach an operation, and what a person does there;
- the repo's written rules: its AGENTS.md, its invariants, its decisions, its design system, its specs;
- the repo's design-system reference, where a written rule leaves a detail open — fetched and quoted, never from memory.

## The hard rules

1. **Do what the person does, through the page**, against the real frontend, the real API, and the real database.
2. **Outside services may be stood in for, reached through their trigger values; the frontend, the API, and the database are real.** No test intercepts a request.
3. **Read source for selectors, not for the answer.**
4. **Find elements by role, test id, or element id**, inside the container they belong to.
5. **A test id finds an element; the test then asserts what the person sees in it.** An attribute that carries a value from the server (a `data-` attribute holding a status, an outcome, or a state) is forbidden, to add and to assert on: the page can show the wrong thing and the test stays green. Where the only way to tell two states apart is such an attribute, say so in the report and assert what the person sees.
6. **Assert the fact a message carries** (a number, a name, which question it is on), not its sentence, unless the source gives the sentence.
7. **A red-on-purpose test sits in a test of its own** wherever the person can reach it on its own, so the rest still run. Where it can't be reached on its own, it stays where it is and blocks; the steps behind it are "not run", and their rows are open.
8. **No workaround to get a test past a defect:** no `force`, no `.first()`, `.last()`, or `.nth()`, no `nth-child`, no `waitForTimeout`, no `.catch(`, no `try` around an assertion, no request interception, no type assertion, no keyboard in place of a click, no reload the source doesn't have, no direct API call in place of what the person does, no retry, no loosened match, no input chosen to steer round the defect.
9. **Only a browser test that has run closes a row.** A server test, a page test, or a component test does not.
10. **What the server says today, its code and its sentences included, is evidence, never an expected value.** Every sentence is judged against the written rules for wording. One that breaks a rule gets a test that asserts the rule, red, with `Shortfall` citing the code. One no rule covers goes to the user, quoted, as a question with one recommended answer.
11. **Playwright is the maintained browser driver.** The runner's exact command and flags are the repo's: the case's spec and its AGENTS.md name them.
12. **The runner runs every test of the case** — it does not stop at the first failure, because an area with a red-on-purpose test would never run the rest — and each run writes to a private output folder of its own.

## Disproving a claim about a page

For "a person can't cause this from a page" (a `CantHappen` claim), the disprover tries to find a way: the page opened by its address, a page loaded before the state changed, a second tab, a second person, Back, a reload, an upload, a pasted value. Where a control is hidden, the claim says what hides it, and whether opening by address, or acting from a page loaded before the state changed, still reaches it.

## The sweep

After the build, list every one of the hard rules' forbidden items in the test file and its helpers, with file, line, and what it is used for — including an assertion on a server-valued attribute in place of what the person sees, and a `request` call that does what the source says a person does.
