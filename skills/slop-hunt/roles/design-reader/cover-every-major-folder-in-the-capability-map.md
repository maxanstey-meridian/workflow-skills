## Cover every major folder in the capability map

**Law:** Build the capability map from the composition root, folder layout, entry points, and `sizes.txt` so every top-level folder in `sizes.txt` with over 2% of scope belongs to a line of the map.

**When:** Producing the capability map in a design-reader pass.

Bad: Leaving a top-level folder holding 8% of `sizes.txt` out of the capability map because it looked like support code.
Good: Accounting for every top-level folder over 2% of scope on a line of the capability map, sorted by lines.
