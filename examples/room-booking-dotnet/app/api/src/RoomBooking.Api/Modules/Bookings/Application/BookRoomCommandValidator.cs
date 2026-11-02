using FluentValidation;

namespace RoomBooking.Api.Modules.Bookings.Application;

public sealed class BookRoomCommandValidator : AbstractValidator<BookRoomCommand>
{
    public BookRoomCommandValidator()
    {
        RuleFor(command => command.RoomId).NotEqual(Guid.Empty).WithErrorCode("VALIDATION_FAILED");
        RuleFor(command => command.Start)
            .NotEqual(default(DateTimeOffset))
            .WithErrorCode("VALIDATION_FAILED");
        RuleFor(command => command.End)
            .NotEqual(default(DateTimeOffset))
            .WithErrorCode("VALIDATION_FAILED");
        RuleFor(command => command.End)
            .GreaterThan(command => command.Start)
            .WithErrorCode("END_BEFORE_START");
    }
}
