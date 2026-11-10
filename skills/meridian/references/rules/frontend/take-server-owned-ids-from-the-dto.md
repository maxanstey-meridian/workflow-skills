## Take server-owned ids from the DTO

**Law:** A route, link, query value, request, or comparison takes a server-owned id from the DTO, never from a hand-written literal.

**When:** Any UI. A table keyed on an id may map it only to presentation (labels, colours, icons).

Bad: `if (connector.id === "acme-crm")`
Good: `if (connector.id === form.connectorId)`, both ids read from DTOs.
