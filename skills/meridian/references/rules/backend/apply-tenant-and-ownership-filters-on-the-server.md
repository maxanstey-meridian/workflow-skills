## Apply tenant and ownership filters on the server

**Law:** Tenant and ownership filters are enforced on the server for every read and write; the UI sending the right id is never the control.

**When:** Any multi-tenant or owner-scoped data.

Bad: `GET /forms?tenantId=…` trusted as sent.
Good: The query filtered by the tenant on the authenticated session.
