using Cowork.Api.Common;
using Rivet;

namespace Cowork.Api.Contracts.Rooms;

[RivetContract]
public static class RoomsContract
{
    public static readonly RouteDefinition<AddRoomRequest, AddRoomResponse> Add = Define
        .Post<AddRoomRequest, AddRoomResponse>("/api/rooms")
        .Summary("Add a room")
        .Description("Staff add a room to the space's bookable inventory.")
        .Returns<ErrorResponse>(422, "Validation failed");

    public static readonly RouteDefinition<RoomsResponse> List = Define
        .Get<RoomsResponse>("/api/rooms")
        .Summary("List rooms")
        .Description("Every bookable room, plus the limits the add-room form validates against.");
}
