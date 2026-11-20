## Check a Test citation's name against the row

**Law:** For a pass that owns `Test`, hold each test against its row: a citation is a file plus a verbatim quote — grep the quote in the named file, and a citation that does not grep is a finding — and for a `Test` citation, the quote must show the test's name, and the test's name is the row's id in snake_case, PascalCase, or camelCase, or the id verbatim, compared lower-case with only letters and digits (the id `greet.no-person.exit-2` is named by `greet_no_person_exit_2`, `GreetNoPersonExit2`, `greetNoPersonExit2`, and `greet.no-person.exit-2`), and the match is equality, so a name that holds the id plus more, or the id's prefix, names no row.

**When:** Every `Test` record you grade.

Bad: A CONFIRMED on a `Test` citation whose quote shows `greet_no_person` — the id's prefix, which names no row.
Good: The same citation refused, the name quoted, and the row left open until a test named `greet_no_person_exit_2` exists.
