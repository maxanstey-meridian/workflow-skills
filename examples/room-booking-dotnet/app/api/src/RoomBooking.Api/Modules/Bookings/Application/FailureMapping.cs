using System.Diagnostics;
using FluentResults;

namespace RoomBooking.Api.Modules.Bookings.Application;

public static class FailureMapping
{
    /// <summary>A declared use-case failure: exactly one AppError.</summary>
    public static AppError SoleFailure<T>(this Result<T> result) =>
        (AppError)result.Errors.Single();

    public static int HttpStatus(this FailureStatus status) =>
        status switch
        {
            FailureStatus.Validation => 422,
            FailureStatus.NotFound => 404,
            FailureStatus.Forbidden => 403,
            FailureStatus.Conflict => 409,
            _ => throw new UnreachableException($"{status} has no HTTP mapping"),
        };
}
