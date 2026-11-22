## Hide a choice that has only one option

**Default:** Hide a dropdown whose only option is its current default, keep it mounted until a second option exists, and state the default as text if not obvious.

**When:** Dropdowns, except target pickers (stage, list, column) and lone stale "(unavailable)" options, which stay visible; in Vue use `v-show`, not `v-if`, to preserve state.

Bad: A "Date format" dropdown listing only "Day, month, year".
Good: Text "Dates are shown as day, month, year", revealing the dropdown once a second format exists.
