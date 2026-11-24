using FluentResults;
using FluentValidation.Results;

namespace Cowork.Api.Common;

/// <summary>
/// An application failure that maps to the declared error envelope:
/// a stable code the frontend matches on, a message, and optional
/// per-field errors for validation failures.
/// </summary>
public sealed class AppError : Error
{
    public AppError(
        string code,
        string message,
        IReadOnlyDictionary<string, string[]>? fieldErrors = null
    )
        : base(message)
    {
        Code = code;
        FieldErrors = fieldErrors;
    }

    public string Code { get; }

    public IReadOnlyDictionary<string, string[]>? FieldErrors { get; }
}

public static class AppErrors
{
    /// <summary>Builds the one validation failure shape from a FluentValidation result.</summary>
    public static AppError ToAppError(this ValidationResult result)
    {
        var fieldErrors = result
            .Errors.GroupBy(f => f.PropertyName)
            .ToDictionary(g => g.Key, g => g.Select(f => f.ErrorMessage).ToArray());
        return new AppError(
            "validation.failed",
            "Some details are missing or invalid.",
            fieldErrors
        );
    }
}
