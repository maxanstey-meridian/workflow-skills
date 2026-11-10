## Never treat a clean Plumb run as a review

**Tooling:** Plumb's findings are the floor, not the review: a clean run is never reported as a review.

**When:** Reviewing in a repo that uses Plumb.

Bad: "Review: Plumb passes, no findings".
Good: the diff read against the rules, with Plumb's result as one line of the review.
