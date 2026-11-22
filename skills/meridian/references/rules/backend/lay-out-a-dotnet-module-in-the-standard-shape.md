## Lay out a dotnet module in the standard shape

**Default:** Put a .NET module under `Modules/<Feature>/` with `Contracts/` (only when publishing cross-module APIs), `Domain/`, `Application/` (`Ports/` + one `<UseCaseName>/<UseCaseName>UseCase.cs` folder per use case), `Infrastructure/`, and root `<Feature>Controller.cs` + `<Feature>Module.cs` (no `Interface/` folder by default).

**When:** Creating or reshaping .NET backend modules.

Bad: `Modules/Forms/Interface/Controllers/FormsController.cs`, with ports under `Infrastructure/`.
Good:
```text
Modules/<Feature>/
├── Contracts/          # published cross-module API, when needed
├── Domain/
├── Application/
│   ├── Ports/
│   └── <UseCaseName>/
│       └── <UseCaseName>UseCase.cs
├── Infrastructure/
├── <Feature>Controller.cs
└── <Feature>Module.cs
```
