## Name each job's time as a commented constant

**Default:** A job's time is a named constant, in the time zone its users live in, with a comment that says why it runs then.

**When:** Any scheduled job.

Bad: `"0 2 * * *"` inline in the registration.
Good: `DigestTime = 06:30 Europe/London // before staff sign in`
