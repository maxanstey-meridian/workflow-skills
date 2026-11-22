## Judge which module needs which from the domain first

**Default:** Determine module dependency direction from the domain first, stored data second, and existing code last (since existing code is what is under suspicion).

**When:** Testing whether module X could keep its rules without Y. Domain: people running the domain can answer directly. Stored data: a required `y_id` on X's own row at creation suggests X needs Y; an optional id or child/link row only shows association.

Bad: "Records depends on Cases because `RecordsController` already imports it."
Good: "Records can be issued manually without a Case and `records.case_id` is optional, so Records doesn't need Cases."
