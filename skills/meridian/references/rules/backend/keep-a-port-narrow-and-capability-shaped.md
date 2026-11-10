## Keep a port narrow and capability-shaped

**Default:** A port names one narrow capability the application needs (something the code needs done for it); it is not a giant service, a mirror of an SDK, or wider than the capability used.

**When:** Declaring a port (the Application-owned type that names a capability) on .NET or TypeScript.

Bad: `StorageService` with twenty methods copied from the blob SDK.
Good: `DocumentStore` with `Save` and `Open`.
