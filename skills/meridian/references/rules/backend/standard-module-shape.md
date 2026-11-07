## Standard Module Shape

### .NET

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

Rules:

- controllers live at the module root
- no `Interface/` folder by default
- ports live in `Application/Ports`
- infrastructure implements those ports
- module registration is explicit in `<Feature>Module.cs`

### TypeScript

```text
src/modules/<feature>/
├── contracts/          # deliberately published module API, when needed
├── domain/
├── application/
│   ├── ports/
│   └── <use-case>.ts
├── infrastructure/
├── interface/http/<feature>-routes.ts
└── <feature>.module.ts
```

Rules:

- same dependency direction as .NET
- module registration is explicit in the module file (`<feature>.module.ts`)
- do not hide boundaries behind barrel files or magic provider discovery
- ports live in `application/ports`
- adapters live in `infrastructure`
