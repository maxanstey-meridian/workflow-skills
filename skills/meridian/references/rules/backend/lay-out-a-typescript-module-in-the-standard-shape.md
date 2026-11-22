## Lay out a TypeScript module in the standard shape

**Default:** Put a TypeScript module under `src/modules/<feature>/` with `contracts/` (only when publishing cross-module APIs), `domain/`, `application/` (`ports/` + one file per use case, directly or in `use-cases/`), `infrastructure/`, `interface/http/<feature>-routes.ts`, and `<feature>.module.ts`.

**When:** TypeScript backends (same dependency direction as .NET).

Bad: `src/services/forms.service.ts` and `src/routes/forms.ts`.
Good:
```text
src/modules/<feature>/
├── contracts/          # published cross-module API, when needed
├── domain/
├── application/
│   ├── ports/
│   └── <use-case>.ts
├── infrastructure/
├── interface/http/<feature>-routes.ts
└── <feature>.module.ts
```
