## Read the server's answer, never re-derive its rule

**Law:** The UI never works out a server-decided rule (allowed actions, editability, draft-vs-published diff, role visibility); it reads the server's read model (`availableActions`, permissions, or a named flag), adding it to the DTO if missing.

**When:** Any UI. Never derive rules from status strings, timestamps, counters, version lists, or roles; a copy that agrees today is still removed (agreement sets urgency, not whether). Page, tab, and button visibility comes from session permissions computed from the same named policies the endpoints enforce, not role checks. The UI owns only client state (unsaved edits, in-flight requests, local input validity) and combines it with the server's answer. The test: if the UI's copy were wrong, could the user attempt something the server refuses or miss something it allows? If yes, it is a rule, not presentation.

Bad: `const canPost = form.status === "draft" && user.role === "editor"`
Good: `const canPost = form.availableActions.includes("post") && !isSaving`
