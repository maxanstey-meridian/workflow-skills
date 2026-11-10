## Bring secrets in through validated configuration

**Default:** A secret enters through validated configuration and never becomes a Domain or Application value unless the use case's job is to operate on that secret.

**When:** .NET and TypeScript backends.

Bad: An API key carried on a `Tenant` domain record.
Good: The key read by the gateway adapter from validated configuration.
