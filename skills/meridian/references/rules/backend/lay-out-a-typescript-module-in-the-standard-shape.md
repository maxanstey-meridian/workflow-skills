## Lay out a TypeScript module in the standard shape

**Default:** A TypeScript module is `src/modules/<feature>/` holding `contracts/` (only when it publishes an API, the types it deliberately exposes to other modules), `domain/`, `application/` with `ports/` (the application-owned types that name a capability) and one file per use case (the Application code for one operation), placed directly in `application/` or in `application/use-cases/`, `infrastructure/` for adapters (the implementations of ports), `interface/http/<feature>-routes.ts`, and `<feature>.module.ts`.

**When:** TypeScript backends; dependency direction is the same as on .NET.

Bad: `src/services/forms.service.ts` and `src/routes/forms.ts`.
Good:
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
