## Cite a file with a quote that greps

**Law:** A value has at least one citation, and a citation is a file plus a verbatim quote of 3 characters or more: the file is under the root, or is `meridian:<rules-file>` for a Meridian rule, and the ledger looks for the quote in the file itself, with whitespace runs compared as one space, so a quote that does not grep is refused.

**When:** Every value you write, and every claim you make in your report.

A citation is a grep-able anchor, never a line number: line numbers rot and quotes grep.

Bad: A citation to `greet.ts:14`, a line number that rots when the file changes.
Good: A citation to `greet.ts` with the sentence it holds, which greps today and next week.
