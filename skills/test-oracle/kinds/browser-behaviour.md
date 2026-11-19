# Browser behaviour

What is true of any case whose rows are things a person does in a browser. A case uses this file when the user names the kind `browser-behaviour` at the start, and its agents read it after the rules and before `SKILL.md`.

## What a browser test may change, and what it may not do

A stand-in for an outside service, and a test id a step needs in order to find an element, are the only app changes it may make (rule 14).

9. **A red step sits in a test of its own wherever the person can reach it on its own**, so the rest still run. Where it can't be reached on its own, it stays where it is and blocks. The steps behind it are then "not run", and their rows are open.
10. **Outside services may be stood in for; the frontend, the API, and the database are real.** No journey intercepts a request.
14. **A test id finds an element. The step then asserts what the person sees in it.** An attribute that carries a value from the server (a `data-` attribute holding a status, an outcome, or a state) is forbidden, to add or to assert on: the page can show the wrong thing and the step stays green.

## Building the test

- Read source for selectors, not for the answer.
- Do what the person does, through the page.
- Find elements by role, test id, or element id, inside the question, row, panel, or dialog they belong to. Assert the fact a message carries (a number, a name, which question it is on), not its sentence, unless the plan gives the sentence.
- A test id finds an element; you then assert what the person sees in it. Never add, and never assert on, an attribute that carries a value from the server (a `data-` attribute holding a status, an outcome, or a state). If the only way to tell two states apart is such an attribute, say so in your report and assert what the person sees.
- A step the plan marks red on purpose (its `Red` field) goes in a test of its own where the plan says so.
- No `.first()`, `.last()`, `.nth()`, `force: true`, `nth-child`, `waitForTimeout`, `.catch(`, `try` around an assertion, `page.route`, or type assertion (`as T`).

## Running the tests

`--max-failures=0` always: the CI run otherwise stops at the first failure, and an area with a red-on-purpose step would never run the rest. One private `--output` per run.

Always `--max-failures=0`, and a `--output` folder of your own.

## Filling a row

- `PersonDoes` — plain English: the page, the control, what they type or press; for two people, both.
- `CausedFromPage` — `"yes"` or `"no"`.

3. **Say what the person does.** Say what a person does on which page to cause this row: the control, what they type or press, and, where it takes two people or two tabs, what each does.

4. **Decide whether a person can cause it from a page.** They can if any sequence of things a person can do in a browser leads to it: typing, pressing, uploading, opening a page by its address, going back, reloading, a second tab, a second person, waiting. They can't only if it takes a crafted request, or a state no page ever offers.

### Where a control is hidden from the person

say what hides it, and whether opening the page by its address, or acting from a page loaded before the state changed, still reaches it.

5. **Find what they should see.**

## Disproving a claim about a page

- **"A person can't cause this from a page."** Try to find a way: the page opened by its address, a page loaded before the state changed, a second tab, a second person, Back, a reload, an upload, a pasted value.

## Planning and checking the steps

- **One step, one thing a person does and what follows.**
- **Steps are what a person does.**

4. **It can be followed.** Read the page's code and the stand-ins. Can a person, and so a test, get to that state and do that thing? A step that would assert on an attribute carrying a value from the server (a `data-` attribute holding a status, an outcome, or a state), in place of what the person sees, is a finding (hard rule 14). Name what the step would use to find each element (a role, a test id, an element id), and say where the meta record's `TestIds` names one that doesn't exist.

5. **It is what a person does.**

### A step marked red on purpose

Is the step in a test of its own where the person can reach it on its own? If it blocks other steps, which rows sit behind it?

## Sweeping a test file

### Part 2: sweep

List every one of these in the file and its helpers, with file and line and what it is used for: `.first()`, `.last()`, `.nth(`, `force: true`, `nth-child`, `expect.soft`, `test.skip`, `test.fixme`, `test.fail`, `.catch(`, `try {`, `waitForTimeout`, `page.route`, `context.route`, ` as ` used as a type assertion, `toBeTruthy` or `toBeDefined` on something that always exists, a `page.request` or `request.` call that does what the plan says a person does, copy the plan doesn't give, and any assertion on an attribute that carries a value from the server (a `data-` attribute holding a status, an outcome, or a state) in place of what the person sees.

Read source for selectors, not for the answer.
