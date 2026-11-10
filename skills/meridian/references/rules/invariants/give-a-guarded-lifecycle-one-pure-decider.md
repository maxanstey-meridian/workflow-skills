## Give a guarded lifecycle one pure decider

**Default:** Give an entity one decider, a pure function that answers "may this action happen now, and if not, why?" and lists the actions that are open, when all four hold: its lifecycle is a small closed set of states (an enum, or a few flags and dates that combine into one), several user actions depend on that state, the answer is needed in several use cases and on the page, and the decision is pure because facts that need I/O are loaded first and passed in.

**When:** Server domain code. Fit is structural: a live bug, or a page that disagrees with the server, shows where a decider would have helped and is not evidence that one fits.

Bad: Four use cases each with their own `if (record.Status ...)` guard, and the page with a fifth copy.
Good: One `RecordLifecycle` with `Refusal(record, action, today)` and `Available(record, today)`:
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
