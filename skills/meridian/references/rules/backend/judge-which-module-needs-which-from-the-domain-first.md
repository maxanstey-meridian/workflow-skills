## Judge which module needs which from the domain first

**Default:** Decide whether one module (a feature folder under `Modules/` or `src/modules/`) needs another from the domain first, from stored data second, and from the code last, because the code is what's under suspicion.

**When:** Answering whether a module could keep its rules if another had never been built. The domain: the people who run it can say whether an X keeps its rules without a Y. Stored data: a required id of Y in X's own row, set when X is made, is evidence that X needs Y; an optional id, or one on a later child or link row, is evidence only that the two are associated, either way.

Bad: "Records depends on Cases, because `RecordsController` already imports it."
Good: "A record can be issued by hand with no Case, and `records.case_id` is optional, so Records doesn't need Cases."
