## Assert user-visible outcomes

**Default:** Follow Meridian's UI testing rules (`tests/never-pin-wording-styling-or-layout-in-a-test.md`, `tests/test-what-the-user-can-do-in-a-ui.md`): write `expect.ui` around what the person sees on screen and can do next, never exact copy, CSS classes, or layout, and add `expect.api` only when wire-level or persisted server state matters alongside the UI.

**When:** Drafting or editing `expect` on any `browser` row.

Bad: `expect: { ui: "Red alert banner with class bg-red-500 says 'Error: invalid name'" }`
Good: `expect: { ui: "An error alert appears explaining the name is required and the form stays editable", api: "POST /api/forms returns 422 and no form is saved" }`
