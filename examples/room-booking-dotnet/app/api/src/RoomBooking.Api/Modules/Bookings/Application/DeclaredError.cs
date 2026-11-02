using System.Text.Json;
using FluentResults;
using FluentValidation.Results;

namespace RoomBooking.Api.Modules.Bookings.Application;

/// <summary>
///     A declared Application failure: a code the transport contract promises, and a message.
///     FluentResults 4's <c>Error</c> is a plain class and C# records can only inherit records,
///     so this is a sealed class, not a record — the same shape as the Users and Rooms modules
///     own, which stays module-local because siblings must not see each other's Application.
/// </summary>
public sealed class DeclaredError : Error
{
    public DeclaredError(string code, string message)
    {
        Code = code;
        Message = message;
    }

    public string Code { get; }

    /// <summary>The field-level errors of a VALIDATION_FAILED failure, keyed by wire field name.</summary>
    public IReadOnlyDictionary<string, string[]>? ValidationErrors
    {
        get
        {
            return Metadata.TryGetValue("errors", out var value)
                ? (IReadOnlyDictionary<string, string[]>)value
                : null;
        }
    }

    public static DeclaredError Validation(IReadOnlyDictionary<string, string[]> errors)
    {
        return new DeclaredError("VALIDATION_FAILED", "The request is invalid.")
        {
            Metadata = { ["errors"] = errors },
        };
    }

    /// <summary>
    ///     Validation failures keep their declared rule code (a validator rule may carry its own
    ///     code, such as END_BEFORE_START); the rest report VALIDATION_FAILED. The field errors
    ///     travel either way.
    /// </summary>
    public static DeclaredError FromValidation(IReadOnlyList<ValidationFailure> failures)
    {
        var errors = ErrorsOf(failures);
        var declared = failures
            .Select(failure => failure.ErrorCode)
            .FirstOrDefault(code => code is not "VALIDATION_FAILED");
        return declared is null
            ? Validation(errors)
            : new DeclaredError(declared, MessageFor(declared))
            {
                Metadata = { ["errors"] = errors },
            };
    }

    private static string MessageFor(string code)
    {
        return code switch
        {
            "END_BEFORE_START" => "The booking must end after it starts.",
            _ => "The request is invalid.",
        };
    }

    public static IReadOnlyDictionary<string, string[]> ErrorsOf(
        IEnumerable<ValidationFailure> failures
    )
    {
        return failures
            .GroupBy(failure => JsonNamingPolicy.CamelCase.ConvertName(failure.PropertyName))
            .ToDictionary(
                group => group.Key,
                group => group.Select(failure => failure.ErrorMessage).ToArray()
            );
    }
}

/// <summary>The 404 and 403 failures the booking use cases share.</summary>
internal static class BookingFailures
{
    public static Result<BookingRow> NotFound()
    {
        return Result.Fail<BookingRow>(new DeclaredError("BOOKING_NOT_FOUND", "No such booking."));
    }

    public static Result<BookingRow> Forbidden()
    {
        return Result.Fail<BookingRow>(
            new DeclaredError("FORBIDDEN", "This booking belongs to someone else.")
        );
    }
}
