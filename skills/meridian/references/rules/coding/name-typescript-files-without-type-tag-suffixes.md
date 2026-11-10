## Name TypeScript files without type-tag suffixes

**Preference:** Use the thing's own name for a TypeScript file and let the directory carry its role, with no `.port.ts`, `.service.ts`, `.provider.ts`, `.use-case.ts`, `.interface.ts`, or `.handler.ts` suffix.

**When:** TypeScript source files on either stack. `<feature>.module.ts` is the one exception; `.spec.ts`, `.test.ts`, `.config.ts`, and `.d.ts` are not type tags.

Bad: `application/ports/mailer.port.ts`.
Good: `application/ports/mailer.ts`.
