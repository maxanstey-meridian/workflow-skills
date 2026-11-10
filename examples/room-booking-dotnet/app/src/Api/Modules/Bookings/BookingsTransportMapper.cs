using Cowork.Api.Contracts.Bookings;
using Cowork.Api.Modules.Bookings.Application.Bookings;
using Cowork.Api.Modules.Bookings.Domain;
using FluentValidation;

namespace Cowork.Api.Modules.Bookings;

public sealed class BookRoomRequestValidator : AbstractValidator<BookRoomRequest>
{
    public BookRoomRequestValidator()
    {
        RuleFor(request => request.RoomId).NotEmpty();

        RuleFor(request => request.EndsAt)
            .GreaterThan(request => request.StartsAt)
            .WithMessage("The booking must end after it starts.");
    }
}

/// <summary>Maps between the wire contract and the bookings module's types at the transport edge.</summary>
public static class BookingsTransportMapper
{
    public static BookingResponse ToResponse(BookingView view) =>
        new(
            view.Id,
            view.RoomId,
            view.RoomName,
            view.StartsAt,
            view.EndsAt,
            view.Status.ToString(),
            view.AvailableActions.Select(action => new BookingActionResponse(
                    ToWireAction(action.Action),
                    action.Enabled,
                    action.Reason
                ))
                .ToArray()
        );

    private static string ToWireAction(BookingAction action) =>
        action switch
        {
            BookingAction.Cancel => "cancel",
            BookingAction.CheckIn => "check-in",
            _ => throw new InvalidOperationException($"Unhandled action {action}"),
        };
}
