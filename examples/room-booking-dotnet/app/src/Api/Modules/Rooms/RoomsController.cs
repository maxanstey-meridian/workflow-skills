using Cowork.Api.Common;
using Cowork.Api.Contracts.Rooms;
using Cowork.Api.Modules.Rooms.Application.AddRoom;
using Cowork.Api.Modules.Rooms.Application.ListRooms;
using FluentResults;
using FluentValidation.Results;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Rivet;

namespace Cowork.Api.Modules.Rooms;

[ApiController]
[Route(RoomsContract.Route)]
[Authorize]
public sealed class RoomsController(
    AddRoomUseCase addRoom,
    ListRoomsQuery listRooms,
    CreateRoomRequestValidator validator
) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken cancellationToken)
    {
        var rooms = await listRooms.ExecuteAsync(cancellationToken);
        return RoomsContract
            .List.Success(rooms.Select(RoomsTransportMapper.ToResponse).ToArray())
            .ToActionResult();
    }

    [HttpPost]
    [Authorize(Policy = "Staff")]
    public async Task<IActionResult> Create(
        [FromBody] CreateRoomRequest request,
        CancellationToken cancellationToken
    )
    {
        var endpoint = RoomsContract.Create.Bind(request);

        var validation = await validator.ValidateAsync(request, cancellationToken);
        if (!validation.IsValid)
        {
            return endpoint.Error(422, ToEnvelope(validation)).ToActionResult();
        }

        var result = await addRoom.ExecuteAsync(
            new AddRoomCommand(request.Name, request.Capacity),
            cancellationToken
        );
        if (result.IsFailed)
        {
            return MapFailure(endpoint, result);
        }

        return endpoint.Success(RoomsTransportMapper.ToResponse(result.Value)).ToActionResult();
    }

    private static ErrorResponse ToEnvelope(ValidationResult validation) =>
        new(
            ErrorHttpMapping.ValidationCode,
            "Validation failed",
            validation
                .Errors.GroupBy(failure => failure.PropertyName)
                .ToDictionary(
                    group => group.Key,
                    group => group.Select(failure => failure.ErrorMessage).ToArray()
                )
        );

    private static IActionResult MapFailure(
        Rivet.BoundRouteDefinition<RoomResponse> endpoint,
        ResultBase result
    ) =>
        endpoint
            .Error(ErrorHttpMapping.ToStatus(result), ErrorHttpMapping.ToEnvelope(result))
            .ToActionResult();
}
