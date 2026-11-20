## Take the expected value from the first source that answers

**Law:** Fill each field of your pass for each row with the citation that shows it, taking the first source in this order that answers, and quoting it verbatim: `written`, then `ruling`, then `meridian`, then `judgement`, and last `today`.

**When:** Every expected field of your pass.

1. `written`: a doc, spec, or contract under the root, other than the code under test. Cite the file and the sentence.
2. `ruling`: the user's answer, a line of a rulings file, the top-level `rulings.md` or your slice's. Cite that line.
3. `meridian`: a house rule in the `rules-*.md` files you read first. Cite `meridian:<that file's name>` and the sentence. Where the code breaks a Meridian rule, that is a bug written into the code, not intent: the expected value comes from the rule, not from the code, and `Shortfall` is filled.
4. `judgement`: where the code is obviously wrong whatever it says (a toast that insults the user), the value is the plain correct reading, `Source` is `judgement`, `Why` says in one sentence why it is plainly wrong, and the citation is the code. Judgement beats `today`; the disprover has to agree with it like any other value.
5. `today`: what the app's code says or does as it stands. Cite the code and the sentence. This is the last resort and is always labelled: the value says it is what the code does today, and `Source` is `today`.

Intent isn't difficult to work out: read the sentence, and ask whether a user or a reviewer would call it wrong. If no source answers, and the code's own say is unclear or contradicts itself, the field is a question for the user, with one recommended answer. Put what the code does in your report as a clause marked "today:", keyed by the row id.

Bad: A `today` value on a field a ruling answers, because the code was open and the rulings file was not.
Good: The same field taking the ruling's line, cited, with the code's differing sentence going to `Shortfall`.
