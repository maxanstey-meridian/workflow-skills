## Keep a port narrow and capability-shaped

**Default:** Give each port one narrow capability — never a giant service, SDK mirror, or wider surface than callers use.

**When:** Declaring ports on .NET or TypeScript.

Bad: `StorageService` copying twenty methods from the blob SDK.
Good: `DocumentStore` with `Save` and `Open`.
