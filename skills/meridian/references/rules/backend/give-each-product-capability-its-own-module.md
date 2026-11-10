## Give each product capability its own module

**Default:** Make a module for each real product capability that has its own language, workflow, or lifecycle; an infrastructure concern, a helper, or a detail of another module is not a module.

**When:** Deciding whether code becomes a new module (one feature's folder under `Modules/` or `src/modules/`) on a .NET or TypeScript backend.

Bad: a `Modules/Email/` that every module calls and that owns no product behaviour.
Good: an email port (the Application-owned type that names a capability) in each module that sends, with one adapter (the implementation of the port) in the host.
