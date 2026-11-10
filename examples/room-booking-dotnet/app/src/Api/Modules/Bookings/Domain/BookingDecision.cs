namespace Cowork.Api.Modules.Bookings.Domain;

/// <summary>
/// A rule's verdict on a supplied booking state. Either the action is open, or it is
/// refused with a stable code (the declared failure) and a reason a member can read.
/// </summary>
public sealed record BookingDecision
{
    private BookingDecision(bool allowed, string refusalCode, string reason)
    {
        Allowed = allowed;
        RefusalCode = refusalCode;
        Reason = reason;
    }

    public bool Allowed { get; }

    /// <summary>Null when allowed; otherwise the stable code the API declares for this refusal.</summary>
    public string? RefusalCode { get; }

    public string Reason { get; }

    public static BookingDecision Allow() => new(true, string.Empty, string.Empty);

    public static BookingDecision Refuse(string refusalCode, string reason) =>
        new(false, refusalCode, reason);
}
