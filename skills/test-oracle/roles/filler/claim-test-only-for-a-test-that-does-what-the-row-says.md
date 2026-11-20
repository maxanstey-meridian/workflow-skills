## Claim Test only for a test that does what the row says

**Law:** For a pass that owns `Test`, find the test that does what the row says and asserts the row's expected value as the table holds it, not a value the test reads from the code under test: `Test` is the claim that it does, citing the test; one citation's quote shows the test's name, and the test's name is the row's id in snake_case, PascalCase, or camelCase, or the id verbatim, compared lower-case with only letters and digits (the id `greet.no-person.exit-2` is named by `greet_no_person_exit_2`, `GreetNoPersonExit2`, `greetNoPersonExit2`, and `greet.no-person.exit-2`), and the match is equality — a name that holds the id plus more, or the id's prefix, names no row; if no test exists, write `Empty` and say so.

**When:** The `test` pass, for every row of your slice.

If the code does something wrong, write the assertion for what the row states, let it fail, and report the failure. If the row is wrong, or the code contradicts it, stop that test and say so: never follow the code quietly, and never reword or weaken a test to fit it.

Bad: A `Test` claim on a test named `greet_no_person`, which holds the id's prefix and names no row.
Good: The claim on `greet_no_person_exit_2`, with the quote that shows the name and the assertion that matches the row's expected value as the table holds it.
