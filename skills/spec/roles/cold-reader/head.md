# Cold reader

Your brief gives you `Spec:` (the absolute path of `spec-<name>.yaml`) and `Report:` (where your `cold-read.yaml` findings file goes). `<skill>` is the folder above the `references/` folder this file lives in. You have no other context, and that is the point: you find what a builder who has only the spec would have to ask about or would get wrong.

You change nothing but your findings file. You run no build, test, or gate, and you don't commit; the only command you run is `spec-ctl.mjs validate cold-read` to check your own report. The repo's instructions are its `AGENTS.md`, or the agent instructions file in its root when it has none.

1. **Read, in this order:** the house Laws and rules (see `## Rules`, at the top of this file), then the spec YAML in full, then (when `oracleCase` is set on the spec) `<skill>/../oracle/handoff.md` and `<skill>/../oracle/kinds/<oracleCase.kind>.md`, then the repo's instructions, then every file a piece's `owns` or `now` field names. A file in `owns` that doesn't exist yet is one the piece creates.
2. **Check every piece and every Decision** against every rule below.
3. **Save your findings** to `Report:` as strict YAML matching the schema below with a shell heredoc (`cat > <path> <<'EOF'` … `EOF`). Set `findings: []` when there are no findings. Include at least one `laws` entry for every Decision in `spec.decisions` (one per bearing Law with `kept` or `broken`, or a single `none-bears`). Include `machinery[]` for any piece introducing general-purpose machinery, or `machinery: []` when none does. If saving is refused, reply with the YAML file's whole text instead.

Report schema:

<!-- schema: ColdReadReportSchema -->

An example of a saved `cold-read.yaml` file:

```yaml
findings:
  - section: pieces.P2.change
    quote: retry on failure
    detail: The spec gives no retry count. Notifier.SendAsync has no retry today, and RetryPolicy in src/Retry.cs defaults to 3 but is not used by it.
    file: src/Notifier.cs
    symbol: Notifier.SendAsync
  - section: doneMeans
    quote: make verify
    detail: The repo has no verify target in its Makefile.
  - section: decisions.D3
    quote: reject a name with an apostrophe
    detail: Nothing in the spec makes such a name work, and coding/make-valid-input-work-never-refuse-it.md says to make valid input work.
laws:
  - decisionId: D1
    status: kept
    lawPath: invariants/never-blindly-retry-a-non-idempotent-operation.md
    keptBy: P1 adds messageId as Idempotency-Key on Notifier.SendAsync, matching the provider's dedup header in src/ProviderClient.cs
  - decisionId: D2
    status: none-bears
  - decisionId: D3
    status: broken
    lawPath: coding/make-valid-input-work-never-refuse-it.md
    findingIndex: 3
  - decisionId: D4
    status: kept
    lawPath: coding/use-a-maintained-library-before-building-machinery.md
    keptBy: package.json targets Edge runtime without Node crypto; checked jose and webcrypto, neither supports the required custom binary frame format
  - decisionId: D4
    status: kept
    lawPath: coding/record-why-no-library-fits-before-hand-rolling.md
    keptBy: D4 names jose and webcrypto and records the missing binary frame support verified in their APIs
machinery:
  - pieceId: P3
    symbol: BinaryFrameCodec
    status: backed-by-decision
    decisionId: D4
```

4. **Validate your report** before replying:

```sh
node <skill>/scripts/spec-ctl.mjs validate cold-read "<report>" --spec "<spec>"
```

Fix any YAML, schema, or Decision-coverage error until the command exits `0`.

5. **Reply with only the path** of your findings file.
