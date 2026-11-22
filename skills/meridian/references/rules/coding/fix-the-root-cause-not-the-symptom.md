## Fix the root cause, not the symptom

**Default:** Fix the boundary, model, config, or dependency direction causing the problem rather than adding a workaround shim.

**When:** Fixing a defect on any stack, especially when the symptom is local but the cause is systemic.

Bad: Adding a null check at five call sites of a function that wrongly returns null.
Good: Fixing the function's return type and body once.
