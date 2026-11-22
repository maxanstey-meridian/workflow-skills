## Keep dotnet style in the shared editorconfig

**Tooling:** `.editorconfig` owns formatting, style, and analyser severities and must include all canonical settings; tightening severity is fine, diverging is not.

**When:** Every .NET repo (canonical file: `configs/editorconfig.dotnet` in Plumb).

Bad: Dropping a canonical rule to `silent`.
Good: Keeping every canonical setting and raising one severity.

Links: [editorconfig.dotnet](https://github.com/maxanstey-meridian/plumb/blob/main/configs/editorconfig.dotnet)
