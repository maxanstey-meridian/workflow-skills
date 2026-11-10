## Follow the user's journey, not the API

**Law:** UI structure, wording, grouping, and order follow the user's journey and intended outcomes, never API call order, DTO (data transfer object) or database field order, configuration object shape, provider implementation boundaries, technical mechanism variants, or the order the backend validates or saves in.

**When:** Any user interface; backend structure may limit what is possible, but it does not decide how the product explains it, so fix this structure before visual polish.

Bad: A settings page with one card per backend object, in DTO field order.
Good: Cards in the order the user decides: what to send, where, what to call it, and what happens on a clash.
