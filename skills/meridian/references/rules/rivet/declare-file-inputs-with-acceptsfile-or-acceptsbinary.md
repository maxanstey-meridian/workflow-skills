## Declare file inputs with AcceptsFile or AcceptsBinary

**Tooling:** Declare multipart uploads with `.AcceptsFile()` and raw streams with `.AcceptsBinary()` — never `.FormEncoded()` for multipart input.

**When:** Rivet routes receiving files.

Bad: `.FormEncoded()` on an upload route.
Good: `.AcceptsFile()` on the upload route.

Links: [endpoint builder reference](https://github.com/maxanstey-meridian/rivet/blob/main/docs/reference/endpoint-builder.md)
