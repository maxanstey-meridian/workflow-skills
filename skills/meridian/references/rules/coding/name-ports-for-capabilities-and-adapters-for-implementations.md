## Name ports for capabilities and adapters for implementations

**Preference:** Use the capability's own name for a port, with no `Port`, `Service`, or `Interface` suffix, and the concrete implementation's name for an adapter.

**When:** Naming a port or an adapter on the backend or the frontend (on the frontend, `Auth`, not `AuthPort`). A port is the application-owned type that names a capability; an adapter implements it.

Bad: `MailerService` implemented by `DefaultMailer`.
Good: `Mailer` implemented by `SendgridMailer`.
