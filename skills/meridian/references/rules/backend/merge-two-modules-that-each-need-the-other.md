## Merge two modules that each need the other

**Law:** When each of two modules (feature folders under `Modules/` or `src/modules/`) can keep its rules only with the other, they are one concept in two modules, so merge them.

**When:** Two modules where neither could keep its rules if the other had never been built. When the cause is one module holding two concepts that sit at different points, such as definitions that others pin and the instances made from them, split that module so each concept sits in its own place.

Bad: `Invoices` and `InvoiceLines` as two modules, each checking its totals against the other.
Good: one `Invoices` module.
