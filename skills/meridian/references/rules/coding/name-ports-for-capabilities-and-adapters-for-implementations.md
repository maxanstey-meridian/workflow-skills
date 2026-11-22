## Name ports for capabilities and adapters for implementations

**Preference:** Name a port for its capability without `Port`, `Service`, or `Interface` suffixes, and name an adapter for its concrete implementation.

**When:** Naming ports and adapters on backend or frontend (e.g., `Auth`, not `AuthPort`).

Bad: `MailerService` implemented by `DefaultMailer`.
Good: `Mailer` implemented by `SendgridMailer`.
