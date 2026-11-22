## Write a TypeScript port as an abstract class

**Default:** Declare a TypeScript port as an abstract class with a private constructor and only abstract methods (no fields, implementation, or static factory) that adapters `implement` (never `extend`).

**When:** TypeScript backends, where the class serves as the runtime injection token (Nest) or the type behind a `typed-inject` key.

Bad: `export interface Mailer { send(input: SendMailInput): Promise<void> }` (no runtime identity).
Good:
```ts
export abstract class Mailer {
  private constructor() {}
  abstract send(input: SendMailInput): Promise<void>;
}

export class SendgridMailer implements Mailer { /* ... */ }
```
