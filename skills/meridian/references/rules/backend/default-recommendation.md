## Default Recommendation

Build a **single-project or single-package modular monolith** first.

Do not start with:

- flat service folders
- giant `common/services`
- many tiny packages/projects
- fake microservice boundaries

The stable boundary is the **module**, not the class and not the package.
