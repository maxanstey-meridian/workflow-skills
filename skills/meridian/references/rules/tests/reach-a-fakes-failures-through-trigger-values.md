## Reach a fake's failures through trigger values

**Default:** In an end-to-end journey, reach a fake's failure modes through agreed trigger values in the fake, not by intercepting the page's requests.

**When:** End-to-end journeys only (Playwright: no `page.route`). A component or page test may fulfil requests.

Bad: `page.route("**/lookup", r => r.fulfill({ status: 503 }))` in a journey.
Good: the journey enters the postcode the fake treats as "look-up down".
