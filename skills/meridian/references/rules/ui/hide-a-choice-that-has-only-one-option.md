## Hide a choice that has only one option

**Default:** A dropdown whose only option is the default it already holds is hidden but kept mounted until a second option exists, with the default's outcome stated as text in its place where that is not obvious.

**When:** Dropdowns, except a control that chooses what a setting points at (a stage, list, or column) and a lone stale "(unavailable)" option, which stay visible; in Vue use `v-show`, not `v-if`, so the control keeps its state.

Bad: A "Date format" dropdown listing only "Day, month, year".
Good: The text "Dates are shown as day, month, year", with the dropdown shown once a second format exists.
