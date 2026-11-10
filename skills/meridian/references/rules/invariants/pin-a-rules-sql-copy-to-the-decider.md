## Pin a rule's SQL copy to the decider

**Default:** When SQL must also express a rule the decider owns, such as a list filter by derived status, keep the SQL copy and hold it to the decider with a test.

**When:** A query that filters or sorts by a state the decider (the one pure function that guards a lifecycle's actions) derives.

Bad: A `WHERE` clause for "extendable records" that nobody compares with `Refusal`.
Good: A test that runs the query and the decider over the same rows and asserts they agree.
