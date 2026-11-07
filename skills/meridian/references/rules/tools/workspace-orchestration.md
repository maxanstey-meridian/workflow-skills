## Workspace / orchestration

When the repo is a real monorepo:

- package manager: `pnpm`
- task graph/caching: `turbo`

For local orchestration:

- use `Task` / `go-task`
- prefer `Taskfile.yml` over ad hoc shell sprawl once commands become real workflow
