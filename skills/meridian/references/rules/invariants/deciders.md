## Deciders

**Default:** give an entity one decider, a pure module that answers "may this
action happen now, and if not, why?", when all four hold:

1. its lifecycle is a small closed set of states (an enum, or a few flags and
   dates that combine into one);
2. several user actions depend on that state;
3. the answer is needed in several use cases and on the page;
4. the decision is pure: facts that need I/O (in use, ready, anything left) are
   loaded first and passed in.

Fit is structural. A live bug, or a page that disagrees with the server, shows
where a decider would have helped; it is not evidence that one fits.

```csharp
public enum RecordAction { Amend, Extend, Suspend, Reinstate, Revoke, Surrender }
public enum RecordRefusal { Anonymised, Lapsed, Ended, AlreadyThere }

public static class RecordLifecycle
{
    public static RecordRefusal? Refusal(RecordState record, RecordAction action, DateOnly today);

    public static IReadOnlyList<RecordAction> Available(RecordState record, DateOnly today) =>
        Enum.GetValues<RecordAction>().Where(a => Refusal(record, a, today) is null).ToList();
}
```

- Inputs are plain state and the time, passed in. No I/O, no clock, no
  repositories, no services. A date-based rule takes the business date ("today"
  in the organisation's time zone) from the one clock every caller uses, not a
  UTC date cut from `now`.
- The refusal is a closed domain value, not an exception. The use case maps it
  once to the declared failure (`backend/results-vs-exceptions.md`).
- Every use case for those actions guards with `Refusal`. The read side projects
  `Available` as `availableActions` on the entity's detail read model, so no
  caller re-derives the rule.
- Formalise the decision only. The state change stays a plain transform (`with`,
  spread) in the use case unless the transform is itself a rule.
- The decider explains; the database enforces. It sits in front of, and never
  replaces, the constraint, conditional write, concurrency token or transaction
  that arbitrates races
  (`invariants/invariant-enforcement.md#persisted-relational-state`). A rule
  SQL must also express, such as a list filter by derived status, keeps its SQL
  copy, held to the decider by a test.

A policy is any pure decision. A decider is the policy that guards one
lifecycle's actions and lists which are open. Use a plain policy function when
there is one decision with one or two callers and no action list to show.

When a criterion fails, use the smaller tool:

- one action, guarded in one place: an inline guard, plus a flag if the page
  needs it;
- users need one yes/no about the entity, not an action list: project a flag on
  the read model;
- the system, not a user, drives the transitions (deliveries, deadlines,
  retries): conditional writes and constraints own them;
- an external system owns the lifecycle: mirror its states as a closed type;
- the database already expresses the whole rule: leave it there.
