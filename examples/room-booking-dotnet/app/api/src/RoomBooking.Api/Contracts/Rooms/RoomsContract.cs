using Rivet;
using RoomBooking.Api.Common;

namespace RoomBooking.Api.Contracts.Rooms;

[RivetContract]
public static class RoomsContract
{
    public const string CreateRoute = "/api/rooms";

    public const string ListRoute = "/api/rooms";

    public static readonly RouteDefinition<AddRoomRequest, AddRoomResponse> Create = Define
        .Post<AddRoomRequest, AddRoomResponse>(CreateRoute)
        .Description("Add a room that members can book.")
        .Returns<ErrorResponse>(422, "The room details are invalid.")
        .Returns(403, "Only staff can add rooms.");

    public static readonly RouteDefinition<RoomsResponse> List = Define
        .Get<RoomsResponse>(ListRoute)
        .Description("Every room, with how many people it holds.");
}
