## Commits

Commit messages follow Conventional Commits 1.0, and versions follow
Semantic Versioning derived from them. The message's job is to let a reader
of `git log --oneline` see what each commit did, and a reader of the full
message see what changed for the user and why.

The shape:

```
type(scope): subject

Body: what changed for the user, and why, in plain English.

BREAKING CHANGE: what a consumer must change.
```

- the subject is `type(scope): subject`: imperative mood, lower-case, no full
  stop, under 72 characters; it names the change, not the files
- the type is one of `feat` (new behaviour, a new rule, step, or capability),
  `fix` (a correction to behaviour or doctrine), `docs`, `refactor`, `test`,
  `build` (the build, dependencies, generated output), or `chore`
- the scope is the folder or module the change lives in, as the repo names it
  (`cycle`, `meridian`, `examples`, a feature folder in an app); there is no
  fixed list per repo, and a change across the whole repo has no scope
- a blank line, then the body: prose, wrapped at 72 columns, saying what
  changed for the user and why; the subject never carries the body
- a `BREAKING CHANGE:` footer for anything a consumer depends on: a renamed or
  removed rule file or heading (Plumb's docRefs resolve against them), a
  routine's arguments or report format, a repo's shortcuts in its
  instructions, a published package's API, a stored data shape
- one commit per reviewed unit: a `/cycle` round is one commit, typed by its
  highest-ranked change (breaking, then `feat`, then `fix`, then the rest),
  with the rest listed in the body; a round is never split by type after
  review, since that invents history

The version follows the commits since the last tag: a `BREAKING CHANGE`
bumps the major, a `feat` the minor, a `fix` the patch. Tagging is an action
only the user names.

Good:

```
refactor(meridian): merge each design's sections into one document

Each multi-part design is now one document, read whole, and every
bundle that carries part of a design carries all of it.

BREAKING CHANGE: rule files renamed and merged; docRefs move with them
```

Bad:

- a 500-character subject with no body
- `Review fixes: …` or `Update laws.md`: no type, and the subject names the
  activity or the file, not the change
- a subject copied from the repo's recent log: the log is the output of this
  rule, never its source
