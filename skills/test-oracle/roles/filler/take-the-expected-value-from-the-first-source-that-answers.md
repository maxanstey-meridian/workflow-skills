## Take the expected value from the first source that answers

**Law:** Fill each expected field of each row from the first source in this order that answers — `written`, then `ruling`, then `meridian`, then `judgement`, then `today` — label it with that word in `Source`, quote the source verbatim, and give it the citations that word says it cites; the five words are the whole of it, and there is no other kind of source.

**When:** Every value you write for an expected field.

1. `written`: a doc, spec, or contract under the root — never the code the row's `Where` points into, never the row script, never a file under the case folder. Cite the file and the sentence.
2. `ruling`: the user's answer, a line of a rulings file — the top-level `rulings.md`, or your slice's. Cite that line; a question with a ruling is a field you fill again, as a value citing it.
3. `meridian`: a house rule in the `rules-*.md` files you read first. Cite `meridian:<that file's name>` and a quote that is in it. Where the code breaks a rule, that is a bug written into the code, not intent: the value comes from the rule, and the row gets its `Shortfall`.
4. `judgement`: where the code is obviously wrong whatever it says (a toast that insults the user): the value is the plain correct reading, `Why` says in one sentence why it is plainly wrong, and the citation is the code. It beats `today`, and the disprover has to agree with it like any other value.
5. `today`: what the app's code says or does as it stands — the last resort, cited to the code, and always labelled: `Source` is `today`, and the value says in its own words that it is what the code does today.

A web page is saved to a file under the root and cited there, as `written`. Judgement is not hard to judge: read the sentence, and ask whether a user or a reviewer would call it wrong.

Bad: A `today` value on a field a ruling answers, because the code was open and the rulings file was not.
Good: The same field taking the ruling's line, cited, with the code's differing sentence going to `Shortfall`.
