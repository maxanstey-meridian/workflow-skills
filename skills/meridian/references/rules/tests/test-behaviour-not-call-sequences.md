## Test behaviour, not call sequences

**Default:** Assert what happened (outputs, state changes, and side effects that matter), not how the code was called or the order of its internal calls, unless that order is itself the behaviour.

**When:** Every test, on any stack.

Bad: `repo.Received(1).Save(Arg.Any<Form>())` as the only assertion.
Good: the saved form loaded back and its fields asserted.
