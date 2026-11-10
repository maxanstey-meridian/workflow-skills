using Cowork.Api.Common;
using Rivet;

namespace Cowork.Api.Contracts.Rooms;

[RivetContract]
public static class RoomsContract
{
    public const string Route = "api/rooms";

    public static readonly RouteDefinition<IReadOnlyList<RoomResponse>> List = Define
        .Get<IReadOnlyList<RoomResponse>>("/api/rooms")
        .Description("Every room in the space, by name.")
        .Returns<ErrorResponse>(500, "Unexpected failure");

    public static readonly RouteDefinition<CreateRoomRequest, RoomResponse> Create = Define
        .Post<CreateRoomRequest, RoomResponse>("/api/rooms")
        .Description("Add a room to the space.")
        .Returns<ErrorResponse>(422, "Validation failed");
}
