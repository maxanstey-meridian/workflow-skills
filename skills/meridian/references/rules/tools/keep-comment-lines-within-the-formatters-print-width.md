## Keep comment lines within the formatter's print width

**Preference:** Keep comment-only lines within the formatter's print width by hand, since neither `CSharpier` nor `oxfmt` wraps comments; a single unbreakable token (a URL, a path) may overflow, and so may a tool directive, which its tool reads from that one line.

**When:** C# (`//`, `///`) and TypeScript comments; the width is the formatter's, and in TypeScript the `printWidth` in `.oxfmtrc.json`. Tool directives include `// ReSharper disable …`, `// csharpier-ignore …`, `// eslint-disable-next-line … -- reason`, and `// @ts-expect-error …`.

Bad: a 140-column `//` comment in a file whose print width is 100.
Good: the same comment wrapped over two `//` lines, each within 100 columns.
