# The pre-spec step

For whoever writes the spec of a case's tests (`/spec`), once the `fill` pass is merged. It is a step for an agent, not a command. `<skill>` below is the folder this file sits in, and `<case>` is the case folder the user named.

The case's tables are the oracle for the tests: one `<case>/<slice>/oracle.jsonl` per slice, each holding the slice's rows and its declared-unplaced lines. Read them, and the case's row script (the program named by the `rows` command in `<case>/oracle.conf.json`), before you write anything. Where the work names a kind, read the kind file in full too: it says what shape the tests must be. `<case>` is an `__oracle__` folder. The spec you write is checked by `/spec`'s cold reader and built by `/go`, both unchanged, so what follows has to be in the spec itself.

## What to do

This step tells you:

- the table is the oracle, and the spec cites rows by id;
- no expected value is restated or reworded in the spec;
- every row is in a piece or is an open ask; none is left out, parked, or marked out of scope;
- Done means is the closing command;
- the builder rules any case needs are Decisions in the spec (for example: write the test as the row says and let it fail; "they pass" is not the report).

## Decisions the spec must carry

Put these in the spec's Decisions, so `/go`'s builder and critic are held to them:

- **No row leaves through the spec.** There is no "out of scope", "parked", "later", or "covered elsewhere" for a row.
- Expected values come from the row's written source, never from what the code does today.
- If the row is wrong, or the code contradicts it, stop that test and say so in your report. Never follow the code quietly, and never reword or weaken a test to fit it.
- "They pass" is not the report. List every place the code and the row disagreed, and every assertion you could not make as the row states it.
- Tests in one file share no state.
- Write the test as the row says and let it fail. Do not change the test, the row, or the code.
- Don't comment the red line out, move it, or change it.
- Each place the code and the row disagreed, and each assertion you could not make as the row states it, and why. A builder's report lists these.

Three more rules of the ledger go in the spec as Decisions too:

- A test names the row whose id equals the test's name, compared lower-case with only letters and digits: equality, not containment. The test's name is the row's id in snake_case, PascalCase, or camelCase, or the id verbatim, so the id `greet.no-person.exit-2` is named by `greet_no_person_exit_2`, `GreetNoPersonExit2`, `greetNoPersonExit2`, and `greet.no-person.exit-2`, and by nothing else. The ledger finds a row's test by that match and nothing else.
- A red-on-purpose test carries no skip and no expected-failure mark. It is left plainly red, because the table expects red for a row with a confirmed `Shortfall`, and the ledger reads the result.
- The Proof of each piece, and the spec's Done means, are `node <skill>/scripts/ledger.mjs results <case> <the run's JUnit files> --slice <slice>`, never the test runner's exit code: a runner exits non-zero when a red-on-purpose test fails, and `/go`'s critic and `/cycle` treat a non-zero exit as a failure.
