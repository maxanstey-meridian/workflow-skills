## Rivet Rules

Generated Rivet clients are already typed contracts.

Therefore:

- do not wrap Rivet behind ports by default
- do not create fake API service layers unless there is a genuine need
- bootstrap Rivet once at the app boundary
- call generated clients directly inside the composable that implements the capability when appropriate

Good:

- `useRivetAuth()` calls generated session client
- `useSubmissionMessages()` calls generated messaging endpoints directly

Bad:

- `MessagesApiPort` that mirrors generated methods one-for-one
- “service” wrappers that only rename generated methods
