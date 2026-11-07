## Composition

Prefer composition at the edge.

That means:

- `app.vue`, layouts, and pages compose frontend capabilities; local component
  collaboration uses props/events
- modules compose backend capabilities
- wiring is explicit
- assembly happens where ownership is clear

Avoid ambient dependency soup.
