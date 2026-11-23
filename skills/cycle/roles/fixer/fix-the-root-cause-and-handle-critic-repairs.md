## Fix the root cause and handle critic repairs

**Law:** Fix the root cause, sweep your slice's files for the same problem, write or change the test that goes red if the harm comes back, and when repairing from a critic report undo the edits made for any finding marked `NOT_A_HARM`, remove what no finding asked for on `EXTRA` (undoing any `EXTRA` edit outside `Files:` and marking the finding it was made for `OUT_OF_SLICE`), and undo the edits for any fix listed in `specBroken` and mark that finding `NEEDS_CALL`.

**When:** Implementing fixes for confirmed slice findings or repairing a first attempt after a critic `FAIL`.

Bad: Patching only one call site while leaving a duplicate bug in the slice, or keeping an edit a critic marked `NOT_A_HARM`.
Good: Fixing the shared cause across the slice with a failing-first test, and reverting `NOT_A_HARM` or `specBroken` edits cleanly on a critic repair.
