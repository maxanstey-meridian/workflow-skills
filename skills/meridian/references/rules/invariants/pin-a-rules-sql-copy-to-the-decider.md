## Pin a rule's SQL copy to the decider

**Default:** When SQL must mirror a decider rule (e.g., filtering a list by derived status), keep the SQL copy and pin it to the decider with a parity test.

**When:** Any query filtering or sorting by a decider-derived state.

Bad: A `WHERE` clause for "extendable records" never compared against `Refusal`.
Good: A test running the query and decider over the same rows and asserting agreement.
