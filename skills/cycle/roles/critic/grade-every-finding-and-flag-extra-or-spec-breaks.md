## Grade every finding and flag extra or spec breaks

**Law:** Grade each `FIXED` finding (`NOT A HARM` if the removed lines had no real harm; `STILL THERE` if the harm remains or the added test does not assert what the finding named — though do not fail solely when no command or test can show it; `EXTRA` for any unasked diff, loosened or dropped check, or out-of-slice edit that is not a new file, a generated file from a changed source listed on `Changed files:`, a layout-only formatter rewrite listed on `Changed files:`, or a mechanical `nit` block whose `change:` begins `nit:`), grade `NOT FOUND` as `WRONG` if the harm is present at the cited `file:line`, grade any edit for `NEEDS CALL` or `OUT OF SLICE` as `EXTRA`, mark any unmentioned `do: fix` finding in the slice `MISSING`, report any broken spec line on `Against the spec:` with `F<n>`, report file name, quoted spec words, and `file:line`, and end on `VERDICT: FAIL` whenever any finding is `NOT A HARM`, `STILL THERE`, `EXTRA`, `WRONG`, or `MISSING`, a spec line is broken, or any command you ran exited non-zero — else `VERDICT: PASS`.

**When:** Grading every finding and deciding the final verdict of a critic report.

Bad: Returning `VERDICT: PASS` when the fixer omitted one `do: fix` finding or edited an unrelated file outside `Files:` without it being generated or formatter-only.
Good: Marking the omitted finding `MISSING`, flagging the unasked out-of-slice edit `EXTRA`, quoting any broken spec line on `Against the spec:`, and ending on `VERDICT: FAIL`.
