## Give a guarded lifecycle one pure decider

**Default:** Give an entity one pure decider answering "may this action happen now, and if not, why?" and listing open actions when all four hold: its lifecycle is a small closed state set (an enum, or a few flags and dates), several user actions depend on that state, several use cases and the page need the answer, and I/O facts are loaded first and passed in.

**When:** Server domain code. Fit is structural: a live bug or page/server drift shows where a decider would have helped, not that one fits.

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
