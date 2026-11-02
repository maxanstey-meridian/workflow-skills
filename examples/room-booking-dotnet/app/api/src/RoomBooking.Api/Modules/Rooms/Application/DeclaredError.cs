using System.Text.Json;
using FluentResults;
using FluentValidation.Results;

namespace RoomBooking.Api.Modules.Rooms.Application;

/// <summary>A declared Application failure: a code the transport contract promises, and a message.</summary>
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
