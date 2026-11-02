using FluentValidation;

namespace RoomBooking.Api.Modules.Rooms.Application;

public sealed class AddRoomCommandValidator : AbstractValidator<AddRoomCommand>
{
    public AddRoomCommandValidator()
    {
        RuleFor(command => command.Name)
            .NotEmpty()
            .WithErrorCode("VALIDATION_FAILED")
            .MaximumLength(100)
            .WithErrorCode("VALIDATION_FAILED");

        RuleFor(command => command.Capacity)
            .InclusiveBetween(1, 500)
            .WithErrorCode("VALIDATION_FAILED");
    }
}
