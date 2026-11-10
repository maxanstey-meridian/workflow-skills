## Declare file inputs with AcceptsFile or AcceptsBinary

**Tooling:** Declare a multipart upload with `.AcceptsFile()` and a raw stream with `.AcceptsBinary()`, never `.FormEncoded()` for multipart input.

**When:** Rivet routes that receive a file (Rivet reads C# and emits the OpenAPI document and typed terminals for each declared response).

Bad: `.FormEncoded()` on an upload route.
Good: `.AcceptsFile()` on the upload route.

Links: [endpoint builder reference](https://github.com/maxanstey-meridian/rivet/blob/main/docs/reference/endpoint-builder.md)
