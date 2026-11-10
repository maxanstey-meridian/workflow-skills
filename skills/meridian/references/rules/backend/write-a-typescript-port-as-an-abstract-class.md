## Write a TypeScript port as an abstract class

**Default:** Write a port (the Application-owned type that names a capability) as an abstract class with a private constructor and only abstract methods (no fields, no implementation, no static factory), which adapters (the implementations of a port) `implement` and never `extend`.

**When:** TypeScript backends, where the class is also the runtime injection token (under Nest) or the type behind a `typed-inject` key.

Bad: `export interface Mailer { send(input: SendMailInput): Promise<void> }`, which has no runtime identity.
Good:
```ts
export abstract class Mailer {
  private constructor() {}
  abstract send(input: SendMailInput): Promise<void>;
}

export class SendgridMailer implements Mailer { /* ... */ }
```
