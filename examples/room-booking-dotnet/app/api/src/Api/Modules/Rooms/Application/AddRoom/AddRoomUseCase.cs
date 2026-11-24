using Cowork.Api.Common;
using Cowork.Api.Modules.Rooms.Application.Ports;
using Cowork.Api.Modules.Rooms.Domain;
using FluentResults;
using FluentValidation;

namespace Cowork.Api.Modules.Rooms.Application.AddRoom;

public sealed record AddRoomCommand(string Name, int Capacity);

public sealed record AddRoomResult(Guid Id, string Name, int Capacity);

public sealed class AddRoomCommandValidator : AbstractValidator<AddRoomCommand>
{
    public AddRoomCommandValidator()
    {
        RuleFor(c => c.Name)
            .NotEmpty()
            .WithErrorCode("room.name.required")
            .MaximumLength(AddRoomLimits.NameMaxLength)
            .WithErrorCode("room.name.too_long");
        RuleFor(c => c.Capacity)
            .InclusiveBetween(AddRoomLimits.CapacityMin, AddRoomLimits.CapacityMax)
            .WithErrorCode("room.capacity.out_of_range");
    }
}

public sealed class AddRoomUseCase(IValidator<AddRoomCommand> validator, RoomRepository rooms)
{
    public async Task<Result<AddRoomResult>> ExecuteAsync(
        AddRoomCommand command,
        CancellationToken cancellationToken
    )
    {
        var validation = await validator.ValidateAsync(command, cancellationToken);
        if (!validation.IsValid)
        {
            return Result.Fail<AddRoomResult>(validation.ToAppError());
        }

        var room = new Room
        {
            Id = Guid.CreateVersion7(),
            Name = command.Name.Trim(),
            Capacity = command.Capacity,
        };
        await rooms.AddAsync(room, cancellationToken);
        return Result.Ok(new AddRoomResult(room.Id, room.Name, room.Capacity));
    }
}
