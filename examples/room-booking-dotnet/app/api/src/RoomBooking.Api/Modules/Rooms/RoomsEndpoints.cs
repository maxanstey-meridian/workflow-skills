using System.Diagnostics;
using Rivet;
using RoomBooking.Api.Common;
using RoomBooking.Api.Contracts.Rooms;
using RoomBooking.Api.Modules.Rooms.Application;

namespace RoomBooking.Api.Modules.Rooms;

public static class RoomsEndpoints
{
    public static IEndpointRouteBuilder MapRoomsEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost(
                RoomsContract.Create.Route,
                async (
                    AddRoomRequest request,
                    AddRoomUseCase addRoom,
                    CancellationToken cancellationToken
                ) =>
                {
                    var endpoint = RoomsContract.Create.Bind(request);
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

                    var failure = result.Errors.OfType<DeclaredError>().Single();
                    return endpoint.Error(StatusFor(failure), ToErrorResponse(failure)).ToResult();
                }
            )
            .RequireAuthorization("Staff");

        app.MapGet(
                RoomsContract.List.Route,
                async (ListRoomsQuery listRooms, CancellationToken cancellationToken) =>
                {
                    var endpoint = RoomsContract.List;
                    var rooms = await listRooms.ExecuteAsync(cancellationToken);
                    return endpoint
                        .Success(new RoomsResponse(rooms.Select(ToDto).ToList()))
                        .ToResult();
                }
            )
            .RequireAuthorization("Authenticated");

        return app;
    }

    private static int StatusFor(DeclaredError error)
    {
        return error.Code switch
        {
            "VALIDATION_FAILED" or "ROOM_NAME_TAKEN" => StatusCodes.Status422UnprocessableEntity,
            _ => throw new UnreachableException(
                $"No declared status for error code '{error.Code}'."
            ),
        };
    }

    private static ErrorResponse ToErrorResponse(DeclaredError error)
    {
        return new ErrorResponse(error.Code, error.Message, error.ValidationErrors);
    }

    private static RoomDto ToDto(RoomRow room)
    {
        return new RoomDto(room.Id, room.Name, room.Capacity);
    }
}
