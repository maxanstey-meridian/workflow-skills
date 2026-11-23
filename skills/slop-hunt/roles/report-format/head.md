# The hunters' report

This is the YAML format of a hunter's (`report-<area>.yaml`) and the design reader's (`report-design.yaml`) report. The verifier and the reporter read it, and write their own YAML in their role part. Every report is strict YAML validated by `slop-ctl.mjs`: unknown keys are rejected, and multi-line strings use literal block scalars (`|-`), never folded block scalars (`>` or `>-`).

The report holds a **`weightMap`** array (the role part of the hunter or the design reader says what comes before it): one entry per piece of what the report covers (a capability, a subsystem, or a cluster of files that does one job):

- `capability`: what it's for
- `files`: files or folders
- `lines`: non-negative integer from `sizes.txt` (a file may belong to more than one piece; say so in `files`)
- `sharePct`: number `0..100`, those lines as a percentage of every line in `sizes.txt`
- `status`: `"earned"` or `"finding"`
- `earnedWhy`: required non-empty string when `status` is `"earned"`, omitted when `status` is `"finding"`
- `findingId`: required non-empty string (`#N` or `D<n>`) when `status` is `"finding"`, omitted when `status` is `"earned"`

Then **`findings`**, most weight first. The design reader numbers its findings `D1`, `D2`, and so on; hunters number theirs `#1`, `#2`, and so on. Each finding is an object with these exact keys:

```yaml
- id: "#3"
  sign: 1
  kind: judgement
  risk: med
  where: src/Cases/Jobs/RetryScheduler.cs:12-140 (also src/Cases/Jobs/RetryStore.cs:1-60)
  what: A 200-line scheduler re-runs failed notification sends with its own backoff, a lease table, and a poll loop.
  replaceWith: Polly's retry pipeline (Polly 8.4 is already referenced in Cases.csproj) around Notifier.SendAsync; drop the lease table.
  removes: about 200 lines, one table, one hosted service.
  usersLose: nothing on a live send; a failed send is no longer retried after an app restart (the lease table survives one, an in-process retry doesn't).
  proof: |-
    Delta against Polly: backoff and jitter (covered), restart survival (not covered). No spec, test, or instruction asks for restart survival (searched docs/, the tests, and AGENTS.md). History: 4f2a9c1 added the lease table "so a deploy doesn't drop sends".
  against: A deploy mid-retry loses that send, which the lease table was added to stop.
  protectedBy: NotifierTests.SendFailure_IsRetried (tests/Cases/NotifierTests.cs:41) pins the retry; nothing pins restart survival.
```

- **`id`:** `"#N"` (hunter) or `"D<n>"` (design reader), unique within the report.
- **`sign`:** integer `1`..`13`.
- **`kind`:** `"proven"` or `"judgement"`.
- **`risk`:** `"low"`, `"med"`, or `"high"` (scale below).
- **`where`:** `file:line` and every other location.
- **`what`:** what it is, in a sentence or two.
- **`replaceWith`:** the specific API, library, or existing repo code; `"delete"`; or `"hand to <the host, the caller, or a library>"`. One replacement per finding.
- **`removes`:** what goes (lines, types, concepts, dependencies).
- **`usersLose`:** `"none"`, or exactly what users lose.
- **`proof`:** how it was checked, by the standard the sign sets; for a guard or a copy, the commit hash for its history.
- **`against`:** the best case for keeping it, in one line. Required when `kind` is `"judgement"`, and must be omitted when `kind` is `"proven"`.
- **`protectedBy`:** the build; the test, by name, that pins the behaviour and that no finding touches; the tests that change with it, for a behaviour the finding drops; or `"none"`.

A finding that removes fewer than about ten lines and changes no behaviour goes in **`cleanup`** (each entry `{ where, what, replaceWith }`), not `findings`.

Risk:

- **low**: a change the compiler or the type checker proves (an unreferenced private member, an unused import), or private or internal code whose behaviour a test pins: a test that names the symbol or drives its entry point, found by searching the tests.
- **med**: the change crosses files or layers, no test pins the behaviour it touches, or it changes behaviour that users would only see in an edge or an error message.
- **high**: a published package's public API, a consumer outside the repo, a persisted or wire shape, a behaviour change users would notice without being told, a behaviour edge (an error path, a fallback someone may rely on) that no test pins, or a deleted or weakened test of live code.

Then **`alsoNoticed`**: bugs the writer tripped over (`{ where, what, tag? }`), with `tag: data-loss` or `tag: security` when applicable, or `[]`. Re-derived server rules, tests that can't fail, and any broken house Law a sign above covers aren't `alsoNoticed` bugs: they're findings under their sign. Then **`leadsDropped`**: the leads checked and dropped (`{ lead, why }`), or `[]`; "no exact replacement" isn't a reason (sign 1). A hunter also includes **`notReadInFull`**: an array of repo-relative paths of files it didn't read in full, or `[]` when every file in its area was read in full. The design reader has no `notReadInFull` field. Facts and arguments only: one replacement per finding, and no options or asks.
