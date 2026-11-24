using FluentResults;
using Rivet;

namespace Cowork.Api.Common;

/// <summary>
/// The one transport-edge place that maps an application failure to the
/// declared error envelope and its declared HTTP status. Adding a failure
/// code means adding its status here; the throw makes that impossible to
/// skip.
/// </summary>
public static class ErrorResults
{
    public static RivetResult ToErrorResult(
        this ResultBase result,
        BoundRouteDefinitionBase endpoint
    )
    {
        var error = Unwrap(result);
        return endpoint.Error(
            StatusFor(error.Code),
            new ErrorResponse(error.Code, error.Message, error.FieldErrors)
        );
    }

    public static RivetResult ToErrorResult<TSelf>(
        this ResultBase result,
        TerminalRouteDefinitionBase<TSelf> endpoint
    )
        where TSelf : TerminalRouteDefinitionBase<TSelf>
    {
        var error = Unwrap(result);
        return endpoint.Error(
            StatusFor(error.Code),
            new ErrorResponse(error.Code, error.Message, error.FieldErrors)
        );
    }

    private static AppError Unwrap(ResultBase result) =>
        result.Errors.OfType<AppError>().FirstOrDefault()
        ?? throw new InvalidOperationException(
            $"A non-AppError failure reached the transport edge: {result.Errors.FirstOrDefault()?.Message}"
        );

    private static int StatusFor(string code) =>
        code switch
        {
            "validation.failed" or "time.in_past" => StatusCodes.Status422UnprocessableEntity,
            "room.not_found" or "booking.not_found" => StatusCodes.Status404NotFound,
            "booking.slot_taken"
            or "booking.not_active"
            or "booking.check_in_not_open"
            or "booking.check_in_window_closed" => StatusCodes.Status409Conflict,
            _ => throw new InvalidOperationException(
                $"No HTTP status is mapped for error code '{code}'."
            ),
        };
}
