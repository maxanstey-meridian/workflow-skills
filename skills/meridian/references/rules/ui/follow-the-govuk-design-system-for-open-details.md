## Follow the GOV.UK Design System for open details

**Default:** Where accessibility, formatting, display, or validation is unspecified, follow the matching GOV.UK Design System component or pattern and name it in the spec or summary.

**When:** Any UI detail left open by the spec (dates, amounts, errors, required markers, screen-reader announcements); the repo's own UI skill wins where it already decides.

Bad: An invented inline red error under each field with no summary.
Good: The GOV.UK error summary and error message patterns, named in the summary.
