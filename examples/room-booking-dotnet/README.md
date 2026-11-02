One shot by GLM 5.3 Flash with these skills loaded; unreviewed and shown as built.

# Room booking (.NET 10 and Nuxt 4)

This is what one run produced from the prompt below, with no human in the loop and no edits afterwards. The run used the doctrine only: no `/spec`, `/go`, or `/cycle`.

Being one-shot, it isn't perfect. The worst defect: the model read "hold" in the prompt as "only the first 15 minutes are held until check-in", wrote that into its plan as fact, and wrote tests asserting it. That's the kind of call `/spec` puts in front of you as a Decision ("hold the whole slot" being the alternative) before anything is built. The error-handling and setup defects are the kind `/cycle`'s reviewers and gate look for. Neither ran here.

## The run

| | |
| --- | --- |
| Model | GLM 5.3 Flash (`openrouter/z-ai/glm-5.3-flash`) |
| Harness | OpenCode v2.2.0, `opencode run --standalone --auto --format json`, in an empty git repo |
| Skills | this repo's skills, installed with `install.sh` into a clean home; `AGENTS.md` loaded as the instructions |
| Date | 2026-11-02 |
| Time | 78 minutes |
| Cost | $1.69 |
| Database | Postgres 17 in a throwaway container on port 55471 |

The prompt, verbatim:

> Build a small room-booking app for a co-working space: a .NET 10 Web API and a Nuxt 4 single-page frontend, in this empty repo. Follow the meridian skill. Staff add rooms. Members book a room for a time slot, cancel, or check in. A booking not checked in within 15 minutes of its start is released, and members get a reminder email the evening before a booking. Two bookings must never hold the same room at overlapping times. Postgres 17 is running at localhost:55471 (user postgres, password postgres). Include tests and a README saying how to run it. Work until it builds and its tests pass, then stop. This is a non-interactive run: nothing resumes you when a background task finishes, so wait for every subagent you start before you stop.

## What's here

[`app/`](app/) is the repo as the run left it, minus what its own `.gitignore` excludes. Its [README](app/README.md) says how to run it. [`spec.md`](spec.md) is the plan the model wrote before building.

## What the checks found

| Check | Result |
| --- | --- |
| `dotnet build` | passes, 0 warnings |
| `dotnet test` | 70 of 70 pass, on a Testcontainers Postgres 17 |
| `dotnet csharpier check` | clean |
| Rivet contract check and drift gate | pass |
| Frontend typecheck, lint, and build | pass |
| Frontend tests (Vitest) | 31 of 31 pass |
| Plumb | 2 errors, 2 warnings, 16 info (below) |
| The API run as the README says | boots, migrates, and seeds; a booking gets 201, an overlapping one 409, and a staff member booking gets 403 |
