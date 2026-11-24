using Cowork.Api.Common;

namespace Cowork.Api.Modules.Rooms.Application;

public static class RoomsErrors
{
    public static readonly AppError NotFound = new("room.not_found", "Room not found.");
}
