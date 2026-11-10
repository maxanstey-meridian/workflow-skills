## Keep frontend tests in a top-level tests folder

**Preference:** Use a top-level `tests/` directory at the frontend root that mirrors the source tree, rather than `__tests__/` folders or specs beside source files.

**When:** Frontend apps. A Playwright suite may sit in a top-level `e2e/` beside it.

Bad: `app/pages/forms/__tests__/index.spec.ts`
Good: `tests/pages/forms/index.spec.ts`
