## Generated Code

Generated code is already an external contract representation, but not
necessarily the capability boundary the application wants.

Do not wrap generated clients/contracts one-for-one, and never merely because
the code is generated. A layer earns its place only when it:

- combines several generated calls into one capability
- adds non-trivial policy or orchestration
- translates the external model into the application's own terms (an
  anti-corruption layer), because another team owns the contract, it changes
  independently of the application, or tests need a seam the application owns

Bad reasons:

- “we always wrap APIs”
- renaming generated methods without adding meaning
