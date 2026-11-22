## Keep comment lines within the formatter's print width

**Preference:** Wrap comment-only lines manually within the formatter's print width (`CSharpier` and `oxfmt` don't wrap comments); single unbreakable tokens (URLs, paths) and single-line tool directives may overflow.

**When:** C# (`//`, `///`) and TypeScript comments (`printWidth` in `.oxfmtrc.json`). Directives: `// ReSharper disable …`, `// csharpier-ignore …`, `// eslint-disable-next-line … -- reason`, `// @ts-expect-error …`.

Bad: A 140-column `//` comment in a 100-column file.
Good: Wrapping the comment across two `//` lines within 100 columns.
