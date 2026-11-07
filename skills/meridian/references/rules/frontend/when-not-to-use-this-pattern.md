## When Not To Use This Pattern

Do not force the full page-colocated ports-and-adapters structure when the feature is tiny.

Skip ceremony when:

- the component is purely presentational
- the composable is already small and clear
- there is no real capability boundary
- no subtree wiring is needed

If something is trivial, keep it trivial.
