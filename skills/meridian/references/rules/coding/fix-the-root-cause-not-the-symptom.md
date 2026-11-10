## Fix the root cause, not the symptom

**Default:** Fix the boundary, model, configuration, or dependency direction that caused the problem before adding a shim (a workaround layer around it).

**When:** Fixing a defect on any stack, especially when the fix is local but the cause is systemic.

Bad: A null check added at each of five call sites of a function that wrongly returns null.
Good: The function's return type and body fixed once.
