# Kind: `cli`

Unit or process-level tests covering command-line and input/output behaviour directly.

## Row inventory

- **Source:** A row script enumerating each `(command/input, case)` pair — valid invocations, flag combinations, missing or invalid arguments, unknown commands, and error paths.
- **Row shape:** One row per command case, with `slice` grouping related commands (or `"cli"` / `"all"` for a small tool) and optional `where` pointing to the command handler.
- **IDs:** Stable IDs matching test names after lowercase-alphanumeric normalisation (e.g. `greet_name`, `greet_missing`, `list_json`, `list_text`).
- **`oracle.conf.json`:** `kind: "cli"`, `rows: [...]`. Do not set `uiStates`.

## Expectations (`expect`)

`expect` is a plain string stating:

1. Exit code (e.g. `exit 0`, `exit 2`).
2. Key stdout and stderr output (format, ordering, usage message, or error reason).
3. Any filesystem or state changes the command produces or leaves untouched on failure.

Assert the intended behaviour directly — compare actual output with concrete expected values rather than values computed by the code under test.

## Statuses in this kind

- Use `active` for command behaviour that should pass today.
- Use `shortfall` for intended behaviour that today's CLI gets wrong (e.g. wrong sort order, missing validation, wrong exit code).
- Use `cant-happen` only when a combination is structurally unreachable (state why in `reason`).
- Use `other-level` or `struck` (user only, with `reason`) when covered elsewhere or retired.

## Execution and cheat-lint

- Invoke the CLI entry point (exported `run(argv)` function or spawned process) directly in tests and emit JUnit XML (e.g. `node --test --test-reporter=junit`).
- `ledger.mjs results` bans `.skip`, `.only`, `test.fixme`, and `test.fail` in TS/JS test files, and `[Fact(Skip = ...)]` / `[Theory(Skip = ...)]` in non-TS test files.
- Keep `shortfall` tests plainly red against the intended output until the CLI defect is fixed.
