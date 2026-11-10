namespace Cowork.Api.Modules.Bookings.Domain;

/// <summary>
/// The one pure decider for a booking's lifecycle. Every caller — a member cancelling or
/// checking in over the API, the release sweep, the read model's availableActions — asks
/// this decider, so the rules live in exactly one place.
/// </summary>
public static class BookingDecider
{
    public static BookingDecision DecideCancel(BookingState state, DateTimeOffset now) =>
        state.Status switch
        {
            BookingStatus.Booked when now < state.StartsAt => BookingDecision.Allow(),
            BookingStatus.Booked => BookingDecision.Refuse(
                "booking_not_cancellable",
                "This booking has already started; if you do not check in it will be released automatically."
            ),
            BookingStatus.CheckedIn => BookingDecision.Refuse(
                "booking_not_cancellable",
                "You have already checked in to this booking."
            ),
            BookingStatus.Cancelled => BookingDecision.Refuse(
                "booking_not_cancellable",
                "This booking is already cancelled."
            ),
            BookingStatus.Released => BookingDecision.Refuse(
                "booking_not_cancellable",
                "This booking was released because it was not checked in."
            ),
            _ => throw new InvalidOperationException($"Unhandled status {state.Status}"),
        };

    public static BookingDecision DecideCheckIn(BookingState state, DateTimeOffset now)
    {
        if (state.Status != BookingStatus.Booked)
        {
            return BookingDecision.Refuse(
                "booking_not_checkable",
                state.Status switch
                {
                    BookingStatus.CheckedIn => "You are already checked in to this booking.",
                    BookingStatus.Cancelled => "This booking is cancelled.",
                    BookingStatus.Released =>
                        "This booking was released because it was not checked in.",
                    _ => "This booking cannot be checked in.",
                }
            );
        }

        if (now < state.StartsAt - BookingWindows.CheckInOpensBeforeStart)
        {
            return BookingDecision.Refuse(
                "booking_not_checkable",
                $"Check-in opens {FormatMinutes(BookingWindows.CheckInOpensBeforeStart)} before the booking starts."
            );
        }

        if (now > state.StartsAt + BookingWindows.ReleaseGraceAfterStart)
        {
            return BookingDecision.Refuse(
                "booking_not_checkable",
                "This booking was released because check-in was too late."
            );
        }

        return BookingDecision.Allow();
    }

    /// <summary>The release rule the sweep quotes: a booked hold past its grace window is released.</summary>
    public static bool IsReleasable(BookingState state, DateTimeOffset now) =>
        state.Status == BookingStatus.Booked
        && now > state.StartsAt + BookingWindows.ReleaseGraceAfterStart;

    /// <summary>The open member actions and their verdicts, for the read model's availableActions.</summary>
    public static IReadOnlyList<(BookingAction Action, BookingDecision Decision)> AvailableActions(
        BookingState state,
        DateTimeOffset now
    ) =>
        [
            (BookingAction.Cancel, DecideCancel(state, now)),
            (BookingAction.CheckIn, DecideCheckIn(state, now)),
        ];

    private static string FormatMinutes(TimeSpan span) =>
        span.TotalMinutes == 1 ? "1 minute" : $"{(int)span.TotalMinutes} minutes";
}
