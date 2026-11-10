## Derive the version from the commits

**Tooling:** The version follows Semantic Versioning from the commits since the last tag: a `BREAKING CHANGE` bumps the major, a `feat` the minor, a `fix` the patch.

**When:** Choosing a version number for a release.

Bad: a patch bump for a release that contains a `feat` commit.
Good: a minor bump for that release.
