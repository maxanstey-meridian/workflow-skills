## Merge two modules that each need the other

**Law:** If two modules each cannot keep their own rules without the other, they are one concept split in two — merge them.

**When:** Mutual dependency between modules. If the real cause is one module mixing two concepts at different lifecycle points (e.g., pinned definitions and instances), split that module so each sits in its own place.

Bad: `Invoices` and `InvoiceLines` as two modules checking totals against each other.
Good: One `Invoices` module.
