## Take the source from the five words

**Law:** Every value of a `fill` field other than `CantHappen` and `Shortfall` carries `Source`, one of `written`, `ruling`, `meridian`, `today`, `judgement`, and its citations fit it; `CantHappen`, `Shortfall`, and `Test` carry no `Source` and may cite any file under the root; and there is no other kind of source.

**When:** Every expected value you write.

The fit, by word: `written` cites a file under the root that is not the code the row's `Where` points into, not the row script, and not a file under the case folder. `ruling` cites the rulings file the line is in, the top-level `rulings.md` or your slice's. `meridian` cites at least one `meridian:<rules-*.md>` file, with a quote that is in it. `today` cites the code, and says so in the value's own words where it reads naturally. `judgement` cites the code and carries `Why`, one sentence.

The five words are the whole of it: a web page is saved to a file under the root and cited there. The user's ruling is a line of a rulings file — the top-level `rulings.md`, or your slice's `rulings.md` — and you cite that line: a question with a ruling is a field you fill again, as a value, `Source` `ruling`, that cites it. A Meridian rule is cited from its `rules-*.md` file in this skill's `references/` folder, as `meridian:<that file's name>`.

Bad: A `written` value that cites the code the row's `Where` points into, because the code is where the sentence happens to sit.
Good: The same sentence cited to the spec under the root that says it, with the code left as evidence of what happens.
