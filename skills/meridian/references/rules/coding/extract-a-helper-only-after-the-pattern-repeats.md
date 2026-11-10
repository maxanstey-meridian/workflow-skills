## Extract a helper only after the pattern repeats

**Default:** Leave similar lines duplicated until the pattern has shown itself; three similar lines beat a helper extracted the first time the shape appears.

**When:** Any stack, when two pieces of code look alike.

Bad: `formatRow(row, { withTotal, compact })` extracted for two call sites that differ.
Good: The three lines written in each place.
