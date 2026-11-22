## Give each product capability its own module

**Default:** Create a module for each real product capability with its own language, workflow, or lifecycle — never for an infrastructure concern, helper, or detail of another module.

**When:** Deciding whether code deserves a new module (`Modules/` or `src/modules/`).

Bad: `Modules/Email/` called by every module with no product behaviour.
Good: An email port in each sending module backed by one host adapter.
