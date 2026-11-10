## Pin the dotnet SDK with a global json file

**Tooling:** Pin the SDK to .NET 10 in `global.json`, with `rollForward` set to `latestFeature`.

**When:** Every .NET repo.

Bad: a repo with no `global.json`.
Good: `{ "sdk": { "version": "10.0.100", "rollForward": "latestFeature" } }`
