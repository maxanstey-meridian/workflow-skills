## Read the server's answer, never re-derive its rule

**Law:** The UI never works out a rule the server decides (whether an action may happen, whether an entity is editable, whether a draft differs from what is published, which pages a role sees); it reads the server's answer from the read model (the object the server returns for a screen) as `availableActions`, a permission set, or a named flag, and if the DTO lacks it the DTO gains it.

**When:** Any UI. Never work it out from status strings, timestamps, counters, version lists, or roles; a copy that agrees with the server today is still a copy and is removed; agreement sets how soon, not whether. Which pages, tabs, and buttons a user sees comes from permissions the server sends with the session, computed from the same named policies its endpoints enforce, not from comparing the user's role. The UI owns client state only (unsaved edits, requests in flight, the validity of input the server hasn't seen) and gates an action on the server's answer and client state. The test for rule against presentation: if the UI's copy were wrong, could the user attempt something the server refuses, or miss something it allows? If so, it is a rule, not presentation.

Bad: `const canPost = form.status === "draft" && user.role === "editor"`
Good: `const canPost = form.availableActions.includes("post") && !isSaving`
