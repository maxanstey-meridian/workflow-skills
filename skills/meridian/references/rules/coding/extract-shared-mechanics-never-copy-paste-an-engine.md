## Extract shared mechanics, never copy-paste an engine

**Law:** Reuse an existing engine or extract shared mechanics into one owner whenever two or more consumers need the same non-trivial behaviour (such as batch stores, persistence or query pipelines, retry or queue runners, or protocol codecs) rather than copy-pasting it across sibling files.

**When:** Planning, writing, or reviewing code on any stack where a second or third consumer needs the same non-trivial mechanics; ~3-line local snippets stay under `coding/extract-a-helper-only-after-the-pattern-repeats.md`, and single-consumer code stays under `coding/keep-code-local-until-it-is-shared.md`.

Bad: Three batch stores copy-pasting the same cursor, batching, and retry engine across sibling files.
Good: One shared batch-store engine parameterised by each store's query and codec, called by all three stores.
