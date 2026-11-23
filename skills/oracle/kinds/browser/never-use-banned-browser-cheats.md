## Never use banned browser cheats

**Law:** Never use any AST cheat-linted pattern in matched TS/JS tests enforced by `ledger.mjs results`: `.skip`, `.only`, `test.fixme`, `it.fixme`, `describe.fixme`, `test.fail`, `it.fail`, positional locators (`.first()`, `.last()`, `.nth()` — use role, label, or test-id locators instead), `{ force: true }` on clicks or fills, `waitForTimeout(...)` sleeps, `toHaveAttribute("data-...", ...)` on `data-*` implementation attributes, or `keyboard.press(...)` unless the locked row explicitly sets `allowKeyboard: true`.

**When:** Writing or updating any Playwright test matched by a `browser` oracle case.

Bad: `await page.waitForTimeout(500); await page.locator("button").first().click({ force: true });`
Good: `await page.getByRole("button", { name: "Save" }).click();`
