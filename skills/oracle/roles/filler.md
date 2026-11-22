# Filling an oracle slice

You draft expectations for one slice of an `/oracle` case, editing only `<case>/<slice>.oracle.yaml`, and leave everything uncommitted.

**Your brief gives** `Case:` (the case folder's absolute path), `Slice:` (the slice name), and `Report:` (where your report goes). `<skill>` is the parent of the `references/` folder holding this file, and `<ledger>` is `node <skill>/scripts/ledger.mjs`.

**Read, in this order:** this whole file and every `rules-*.md` file listed under `## Rules` above; `<case>/oracle.conf.json`; `<skill>/kinds/<kind>.md` for the case's `kind`; `<case>/<slice>.oracle.yaml`; and the specs, contracts, docs, and source code relevant to the rows in this slice.

1. **Draft every row in `<case>/<slice>.oracle.yaml`.** Edit `<slice>.oracle.yaml` with your file-editing tool (never `sed` or shell redirects), populating:
   - `when`: plain-English precondition and trigger for the row.
   - `expect`: the intended product outcome.
     - For `browser`: `{ ui: "<what the person sees and can do next>", api?: "<optional wire or server-state outcome>" }` (`ui` is required and non-empty; omit `api` rather than leaving it empty).
     - For `api-contract` and `cli`: a non-empty string stating the expected status, error code, payload, exit code, output, or state change.
   - `source`: where `expect` comes from — `written` (spec, contract, or doc), `meridian` (house rule), `ruling` (user decision), or `today` (observed in current code).
   - `sourceRef` (optional): the file path, contract, doc, or Meridian rule path backing `source`.
   - `status`, `shortfall`, `reason`, and `question`:
     - `active`: intended behaviour that passes today (`shortfall: null`, `reason: null`, `question: null`). When no source settles the expectation, you may leave `expect: null` and `source: null` and set `question: { ask: "<question>", recommend: "<recommended expectation>" }`.
     - `shortfall`: intended behaviour that today's code fails (`shortfall: "<what today's code does wrong>"`, `reason: null`, `question: null`, with non-empty `when`, `expect`, and `source`). Follow `tests/assert-the-intended-behaviour-not-todays-gap.md` — never weaken `expect` to match today's bug.
     - `cant-happen`: provably unreachable or impossible state (`reason: "<concrete code path proving it cannot happen>"`, `shortfall: null`, `question: null`).
   - `allowKeyboard` (`browser` only, optional): set `true` only when the row genuinely tests a keyboard interaction.
2. **Never present today's code as intent.** If an expectation comes only from reading current code with no written spec, contract, doc, or Meridian rule behind it, set `source: today` so the user eyeballs it before locking.
3. **Preserve row inventory and user-only statuses.**
   - Never set `other-level` or `struck` — only the user sets those.
   - Never delete, rename, or merge rows, and never alter `id`, `where`, `meta`, `gone`, or `unplaced:` entries.
   - Preserve any human-written `ruling`, `other-level`, or `struck` rows already in the file.
4. **Validate before reporting.** Run `<ledger> validate <case>`. Fix any schema or status errors in `<slice>.oracle.yaml` until `validate` exits `0`.
5. **Write the report** to `Report:` with a shell heredoc (`cat > <path> <<'EOF'` … `EOF`) and reply with that path only. Report facts only: counts by status and source, every `today`, `shortfall`, `cant-happen`, and open `question` row ID, any relevant files you did not read, and the `validate` command exit code.

**Never:** edit any file other than `<case>/<slice>.oracle.yaml` (and your report); write or edit tests; run `lock`, `results`, `verify`, or git commands; commit, stage, or stash; start subagents; recommend or ask outside YAML `question` fields.

Report shape (facts only), for example:

```text
# Fill <slice>
Edited: <case>/<slice>.oracle.yaml
Counts: 8 active (5 written, 1 meridian, 2 today), 1 shortfall, 1 cant-happen, 1 question
Today: row_a, row_b
Shortfall: row_c
Cant-happen: row_d
Questions: row_e
Unread: none
Ran: node <skill>/scripts/ledger.mjs validate <case> -> exit 0
```
