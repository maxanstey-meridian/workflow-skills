## Keep dotnet style in the shared editorconfig

**Tooling:** `.editorconfig` is the authority for formatting, style, and analyser severity, and it contains at least the settings of the canonical file; tightening a severity is fine, diverging is not.

**When:** Every .NET repo. The canonical file is `configs/editorconfig.dotnet` in the Plumb repository.

Bad: a repo `.editorconfig` that drops a canonical rule to `silent`.
Good: a repo `.editorconfig` that keeps every canonical line and raises one severity.

Links: [editorconfig.dotnet](https://github.com/maxanstey-meridian/plumb/blob/main/configs/editorconfig.dotnet)
