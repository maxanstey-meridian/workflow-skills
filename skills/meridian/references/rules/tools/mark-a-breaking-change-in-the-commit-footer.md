## Mark a breaking change in the commit footer

**Tooling:** Add a `BREAKING CHANGE:` footer that says what a consumer must change, for anything a consumer depends on: a published package's API, a stored data shape, a renamed or removed file or heading others cite, a command's arguments or output format.

**When:** Any commit that changes something a consumer depends on.

Bad: `refactor(api): rename the orders endpoint` with no footer.
Good: the same commit with the footer `BREAKING CHANGE: /orders is now /api/orders; update client base paths`.
