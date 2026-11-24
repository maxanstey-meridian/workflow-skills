using Cowork.Api.Common;
using Cowork.Api.Contracts.Rooms;
using Cowork.Api.Modules.Rooms.Application.AddRoom;
using Cowork.Api.Modules.Rooms.Application.ListRooms;
using Rivet;

namespace Cowork.Api.Modules.Rooms;

public static class RoomsEndpoints
{
    public static IEndpointRouteBuilder MapRoomsEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost(
                RoomsContract.Add.Route,
                async (
                    AddRoomRequest request,
                    AddRoomUseCase addRoom,
                    CancellationToken cancellationToken
                ) =>
                {
                    var endpoint = RoomsContract.Add.Bind(request);
                    var result = await addRoom.ExecuteAsync(
                        new AddRoomCommand(request.Name, request.Capacity),
                        cancellationToken
                    );
                    if (result.IsSuccess)
                    {
                        return endpoint
                            .Success(
                                new AddRoomResponse(
                                    result.Value.Id,
                                    result.Value.Name,
                                    result.Value.Capacity
                                )
                            )
                            .ToResult();
                    }

                    return result.ToErrorResult(endpoint).ToResult();
                }
            )
            .RequireAuthorization(AuthPolicies.Staff);

        app.MapGet(
            RoomsContract.List.Route,
            async (ListRoomsQuery listRooms, CancellationToken cancellationToken) =>
            {
                var rooms = await listRooms.ExecuteAsync(cancellationToken);
                return RoomsContract
                    .List.Success(
                        new RoomsResponse(
                            [
                                .. rooms.Rooms.Select(r => new RoomResponse(
                                    r.Id,
                                    r.Name,
                                    r.Capacity
                                )),
                            ],
                            new RoomLimitsResponse(
                                rooms.Limits.NameMaxLength,
                                rooms.Limits.CapacityMin,
                                rooms.Limits.CapacityMax
                            )
                        )
                    )
                    .ToResult();
            }
        );

        return app;
    }
}
