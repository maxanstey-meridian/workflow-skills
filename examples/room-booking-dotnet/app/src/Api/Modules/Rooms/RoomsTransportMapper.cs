using Cowork.Api.Contracts.Rooms;
using Cowork.Api.Modules.Rooms.Contracts;
using FluentValidation;

namespace Cowork.Api.Modules.Rooms;

public sealed class CreateRoomRequestValidator : AbstractValidator<CreateRoomRequest>
{
    public CreateRoomRequestValidator()
    {
        RuleFor(request => request.Name).NotEmpty().MaximumLength(100);

        RuleFor(request => request.Capacity).InclusiveBetween(1, 999);
    }
}

/// <summary>Maps between the wire contract and the rooms module's types at the transport edge.</summary>
public static class RoomsTransportMapper
{
    public static RoomResponse ToResponse(RoomSummary room) =>
        new(room.Id, room.Name, room.Capacity);
}
