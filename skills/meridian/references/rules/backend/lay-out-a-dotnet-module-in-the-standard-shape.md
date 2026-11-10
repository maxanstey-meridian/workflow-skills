## Lay out a dotnet module in the standard shape

**Default:** A .NET module is `Modules/<Feature>/` holding `Contracts/` (only when it publishes an API, the types it deliberately exposes to other modules), `Domain/`, `Application/` with `Ports/` (the application-owned types that name a capability) and one folder per use case (the Application code for one operation) holding `<UseCaseName>UseCase.cs`, `Infrastructure/` for adapters (the implementations of ports), and at its root the controller and `<Feature>Module.cs`, with no `Interface/` folder by default.

**When:** .NET backends, when creating or reshaping a module.

Bad: `Modules/Forms/Interface/Controllers/FormsController.cs`, with ports under `Infrastructure/`.
Good:
```text
Modules/<Feature>/
├── Contracts/          # deliberately published module API, when needed
├── Domain/
├── Application/
│   ├── Ports/
│   └── <UseCaseName>/
│       └── <UseCaseName>UseCase.cs
├── Infrastructure/
├── <Feature>Controller.cs
└── <Feature>Module.cs
```
