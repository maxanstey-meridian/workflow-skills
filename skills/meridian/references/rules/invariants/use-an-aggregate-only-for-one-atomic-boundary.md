## Use an aggregate only for one atomic boundary

**Law:** Use an aggregate only when several facts must change together as one atomic consistency boundary; several fields taking part in one validation do not justify one.

**When:** Modelling domain state on the backend. An aggregate is a group of objects saved and checked as one unit.

Bad: An `Order` aggregate root built because `start` must be before `end`.
Good: A pure function that validates the two dates.
