## Follow the user's journey, not the API

**Law:** UI structure, wording, grouping, and order follow the user's journey and intended outcomes — never API call order, DTO or database field order, config object shape, provider boundaries, technical variants, or backend validation/save order.

**When:** Any UI. Backend limits what is possible, not how the product explains it; fix structure before visual polish.

Bad: A settings page with one card per backend object in DTO field order.
Good: Cards in user decision order: what to send, where, what to call it, and what happens on a clash.
