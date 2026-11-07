## Ports and Adapters

Ports should be:

- narrow
- capability-shaped
- owned by the application layer

Prefer:

- `UserRepository`
- `PasswordHasher`
- `PaymentGateway`
- `FeatureToggles`
- `WorkflowStarter`

Avoid:

- giant “service” ports
- ports that just mirror an infrastructure SDK
- abstraction with no plausible second implementation or no meaningful boundary

### TypeScript port convention

Ports are abstract classes with a private constructor: a type adapters
`implement` but can't `extend` or instantiate, and, under Nest, the runtime DI
token.

The abstract should be effectively stateless and interface-like:

- no fields
- no implementation
- no static factory logic
- no non-abstract methods
- a `private constructor()` so it cannot be instantiated or extended accidentally as a real base type

Example:

```ts
export abstract class Mailer {
  private constructor() {}

  abstract send(input: SendMailInput): Promise<void>;
}
```

Concrete adapters should `implement` the port, not `extend` it.

Example:

```ts
export class SendgridMailer implements Mailer {
  async send(input: SendMailInput): Promise<void> {
    // ...
  }
}
```

Treat these ports as types with interface semantics (and, under Nest, DI keys), not as OO base classes.

When two adapters want shared behavior, the answer is composition — a shared
module of pure functions both adapters call — never a base adapter class. The
port's private constructor makes `extends` impossible on purpose; do not
reintroduce inheritance beside it with an `AbstractBaseMailer`.

### Cross-module collaboration

Use a consumer-owned required port when the consuming use case should control
the dependency shape. Use a provider-owned published contract when the provider
is intentionally offering a stable capability to several consumers. Put only a
genuine shared kernel in Common.

Do not import another module's internal types just because the compiler allows
it. Keep integration translation at the host edge so neither module absorbs the
other's model.
