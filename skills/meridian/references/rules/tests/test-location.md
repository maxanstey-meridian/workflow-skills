## Test Location

Frontend tests live in a top-level `tests/` directory at
the frontend root, mirroring source structure — not colocated `__tests__/` dirs
and not specs scattered beside source files. A Playwright suite may instead sit
in a top-level `e2e/` beside it (Playwright's own suggested name). A TypeScript API or
library keeps its tests in a top-level `test/` or `tests/` directory at its package root.
Backend tests live in the conventionally named sibling test project (`*.Tests`).
