using FluentValidation;

namespace RoomBooking.Api.Contracts.Booking;

public sealed class AddRoomRequestValidator : AbstractValidator<AddRoomRequest>
{
    public AddRoomRequestValidator()
    {
        RuleFor(r => r.Name)
            .NotEmpty()
            .WithErrorCode("room_name_empty")
            .MaximumLength(200)
            .WithErrorCode("room_name_too_long");
        RuleFor(r => r.Capacity).InclusiveBetween(1, 500).WithErrorCode("room_capacity_range");
    }
}

public sealed class BookRoomRequestValidator : AbstractValidator<BookRoomRequest>
{
    public BookRoomRequestValidator()
    {
        RuleFor(r => r.RoomId).NotEmpty().WithErrorCode("booking_room_empty");
        RuleFor(r => r.EndUtc).GreaterThan(r => r.StartUtc).WithErrorCode("booking_slot_inverted");
    }
}

public sealed class AvailabilityRequestValidator : AbstractValidator<AvailabilityRequest>
{
    public AvailabilityRequestValidator()
    {
        RuleFor(r => r.EndUtc)
            .GreaterThan(r => r.StartUtc)
            .WithErrorCode("availability_slot_inverted");
    }
}
