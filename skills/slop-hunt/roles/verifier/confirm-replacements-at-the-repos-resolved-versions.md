## Confirm replacements at the repo's resolved versions

**Law:** For every sign 1 finding, check the delta (each thing the hunter says the custom code does beyond the replacement and each it says the replacement cannot do) and confirm the replacement exists at the repo's resolved framework and package versions, keeping a replacement that is not yet a dependency and not house doctrine furniture with `Against: adds a new dependency, <name>` on the next line.

**When:** Verifying sign 1 findings; check the package version in the project file, `Directory.Packages.props` (Central Package Management), `Directory.Build.props`, or `package.json`, the resolved version in the lockfile (`packages.lock.json` or the JS lockfile), and the installed package (`node_modules/<pkg>/package.json` and its types, `~/.nuget/packages/<id>/<version>/`, or the target framework's API docs) or the official docs for that version.

Bad: Accepting a finding that recommends a Polly 8 API when `Directory.Packages.props` and `packages.lock.json` resolve Polly 7.2.
Good: Checking `Directory.Packages.props`, `packages.lock.json`, and the installed package API before marking the sign 1 finding `kept`.
