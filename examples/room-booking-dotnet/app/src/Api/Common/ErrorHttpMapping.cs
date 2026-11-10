using FluentResults;

namespace Cowork.Api.Common;

/// <summary>
/// The one conversion from a use case's failed <c>Result</c> to the wire error envelope.
/// Each declared failure carries its stable code in error metadata; this maps it to the
/// declared HTTP status. Declared failures are returned as values; anything else surfaces
/// as a 500 through the exception middleware.
/// </summary>
public static class ErrorHttpMapping
{
    public const string ValidationCode = "validation_failed";

    public static ErrorResponse ToEnvelope(ResultBase result)
    {
        var error = result.Errors[0];
        var code =
            error.Metadata.TryGetValue("code", out var value) && value is string c
                ? c
                : "internal_error";
        var fieldErrors =
            error.Metadata.TryGetValue("errors", out var errs)
            && errs is IReadOnlyDictionary<string, string[]> dict
                ? dict
                : null;
        return new ErrorResponse(code, error.Message, fieldErrors);
    }

    public static int ToStatus(ResultBase result)
    {
        var code =
            result.Errors[0].Metadata.TryGetValue("code", out var value) && value is string c
                ? c
                : "internal_error";
        return code switch
        {
            "room_not_found" or "booking_not_found" => 404,
            "validation_failed" or "booking_in_past" => 422,
            _ => 409,
        };
    }
}
