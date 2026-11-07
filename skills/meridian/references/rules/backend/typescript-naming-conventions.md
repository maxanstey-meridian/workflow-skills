## TypeScript naming conventions

Ports are named after the capability itself:

- `Mailer`
- `PasswordHasher`
- `WorkflowStarter`
- `UserRepository`

Adapters are named after the concrete implementation of that capability:

- `SendgridMailer`
- `BcryptPasswordHasher`
- `TemporalWorkflowStarter`
- `PrismaUserRepository`

File naming: no type-tag suffixes — the directory carries the role, the file
is named after the thing. (`.port.ts`, `.service.ts`, `.provider.ts`,
`.use-case.ts`, `.interface.ts`, `.handler.ts` are all banned — tagging one
kind implies tagging them all, so none are tagged. HTTP route
registration is a suffix-free `interface/http/<module>-routes.ts`.)

- ports: `application/ports/mailer.ts`, `application/ports/user-repository.ts`
  — named after the capability; the `ports/` dir already says what they are
- adapters: `infrastructure/sendgrid-mailer.ts`,
  `infrastructure/prisma-user-repository.ts` — named after the implementation
- use cases: `application/create-form.ts` (or `application/use-cases/create-form.ts`)
- sole exception: `<feature>.module.ts` — the composition-root idiom
- test/config dotted names (`.spec.ts`, `.test.ts`, `.config.ts`, `.d.ts`) are
  not type tags

Do not use vague names like:

- `MailerService`
- `MailerInterface`
- `DefaultMailer`
- `BaseMailer`
