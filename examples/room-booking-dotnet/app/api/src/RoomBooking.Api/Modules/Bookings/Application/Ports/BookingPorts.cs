using RoomBooking.Api.Modules.Bookings.Domain;

namespace RoomBooking.Api.Modules.Bookings.Application.Ports;

/// <summary>Write-side consistency port for bookings.</summary>
public interface IBookingRepository
{
    /// <summary>
    /// Persists a new booking. The room-overlap exclusion constraint is the
    /// authority; the outcome reports whether the insert survived it. The
    /// race is arbitrated by the database, never by a preceding check.
    /// </summary>
    public Task<BookingPersistOutcome> AddAsync(Booking booking, CancellationToken ct);

    /// <summary>Atomic conditional write: checked in only while the booking is Booked.</summary>
    public Task<bool> TryCheckInAsync(Guid id, CancellationToken ct);

    /// <summary>Atomic conditional write: cancelled only while the booking is Booked.</summary>
    public Task<bool> TryCancelAsync(Guid id, CancellationToken ct);

    /// <summary>
    /// Releases every Booked booking whose check-in window closed at or before
    /// <paramref name="cutoff"/>. One atomic conditional update, idempotent.
    /// </summary>
    public Task<int> ReleaseStaleAsync(DateTime cutoff, CancellationToken ct);

    /// <summary>Marks a reminder sent once; a rerun never marks it twice.</summary>
    public Task<int> MarkReminderSentAsync(Guid id, DateTime sentAtUtc, CancellationToken ct);
}

/// <summary>Persistence outcome of adding a booking.</summary>
public enum BookingPersistOutcome
{
    Persisted,
    RoomOverlapped,
    RoomMissing,
}

/// <summary>Read shape for bookings, joined with the room's name.</summary>
public sealed record BookingRow(
    Guid Id,
    Guid RoomId,
    string RoomName,
    Guid MemberId,
    string MemberEmail,
    DateTime StartUtc,
    DateTime EndUtc,
    BookingStatus Status,
    DateTime? ReminderSentAtUtc
);

public interface IBookingQueries
{
    public Task<BookingRow?> GetByIdAsync(Guid id, CancellationToken ct);

    public Task<IReadOnlyList<BookingRow>> ListForMemberAsync(Guid memberId, CancellationToken ct);

    /// <summary>Booked bookings starting in [startUtc, endUtc) without a sent reminder.</summary>
    public Task<IReadOnlyList<BookingRow>> ListDueForReminderAsync(
        DateTime startUtc,
        DateTime endUtc,
        CancellationToken ct
    );
}

public sealed record EmailMessage(string To, string Subject, string Body);

public interface IEmailSender
{
    public Task SendAsync(EmailMessage message, CancellationToken ct);
}
