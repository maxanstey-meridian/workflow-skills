## Enforce at the narrowest owner with enough information

**Default:** Put enforcement of an invariant in the narrowest owner that has all the information the invariant needs.

**When:** Choosing where an invariant (a rule the product must always keep true) is enforced.

Bad: The same "name is unique per tenant" check written in three use cases.
Good: One unique index on `(tenant_id, name)`.
