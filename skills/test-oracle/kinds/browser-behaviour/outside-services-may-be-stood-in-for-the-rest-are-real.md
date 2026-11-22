## Outside services may be stood in for, the rest are real

**Law:** Outside services may be stood in for at their own boundary; the frontend, the API, and the database are real.

**When:** Writing a test whose journey touches a service the app does not own.

Bad: A test that routes the app's own `/api` traffic to a stub so the page shows the state the test wants.
Good: A test that drives the page through the values that make the real API reach the outside service, with the service stood in for at its own boundary.
