using FluentResults;

namespace RoomBooking.Api.Modules.Bookings.Application;

/// <summary>Failure kinds the use cases return as values, mapped once at the transport edge.</summary>
public enum FailureStatus
{
    Validation,
    NotFound,
    Forbidden,
    Conflict,
}

/// <summary>
/// Ordinary declared failure. FluentResults is Application furniture: the use
/// case returns it as a value; the endpoint converts it once to the error
/// envelope.
/// </summary>
public sealed class AppError : Error
{
    public AppError(string code, string userMessage, FailureStatus status)
        : base(userMessage)
    {
        Code = code;
        Status = status;
    }

    public string Code { get; }
    public FailureStatus Status { get; }
}
