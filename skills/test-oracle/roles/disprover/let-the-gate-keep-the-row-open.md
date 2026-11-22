## Let the gate keep the row open

**Law:** `merge <case> fill <slice>` appends `CONFIRMED` fields only: PARTLY, WRONG, and CAN'T TELL leave the field empty, which leaves the row open, which sends the work back through the loop, and `CAN'T TELL` is a gate verdict meaning *don't merge*, nothing more.

**When:** Every verdict you write, and every row you would rather close.

Bad: A PARTLY verdict softened to CONFIRMED "so the row can close", with the gap that PARTLY named left unmerged.
Good: The PARTLY standing, the field empty, the row open, and the work sent back through the loop.
