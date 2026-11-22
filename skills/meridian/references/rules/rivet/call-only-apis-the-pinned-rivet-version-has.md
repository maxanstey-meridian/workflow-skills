## Call only APIs the pinned Rivet version has

**Tooling:** Call only Rivet APIs present in the pinned package version; bump the pin before using newer source-only APIs.

**When:** .NET APIs using Rivet.

Bad: Calling `.AcceptsBinary()` while pinned to a Rivet version that lacks it.
Good: Raising the Rivet package pin to a version with `.AcceptsBinary()` in the same change.
