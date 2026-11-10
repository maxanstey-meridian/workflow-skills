## Audit security outcomes without sensitive data

**Default:** Audit events record security-relevant outcomes and leave out sensitive data.

**When:** Any backend that writes an audit trail.

Bad: An audit row "login failed" that stores the password tried.
Good: A row with the user id, the outcome, and the time.
