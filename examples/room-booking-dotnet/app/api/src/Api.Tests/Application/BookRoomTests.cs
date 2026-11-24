using Cowork.Api.Modules.Bookings.Application.BookRoom;
using Cowork.Api.Modules.Bookings.Domain;
using Cowork.Api.Tests.TestSupport;
using Microsoft.Extensions.Time.Testing;

namespace Cowork.Api.Tests.Application;

public sealed class BookRoomTests
{
    private static readonly Guid _roomId = Guid.NewGuid();
    private static readonly DateTimeOffset _now = new(2026, 12, 1, 9, 0, 0, TimeSpan.Zero);
    private static readonly DateTimeOffset _slotStart = new(2026, 12, 1, 10, 0, 0, TimeSpan.Zero);

    private readonly InMemoryBookingRepository _bookings = new();
    private readonly FakeTimeProvider _time = new(_now);

    private BookRoomUseCase CreateUseCase() =>
        new(
            new BookRoomCommandValidator(),
            _bookings,
            new InMemoryRoomDirectory(
                new Modules.Rooms.Contracts.RoomSummary(_roomId, "Huddle", 4)
            ),
            _time
        );

    private BookRoomCommand Command(
        Guid? roomId = null,
        DateTimeOffset? startsAt = null,
        DateTimeOffset? endsAt = null,
        string memberEmail = "member@cowork.test"
    ) =>
        new(
            roomId ?? _roomId,
            startsAt ?? _slotStart,
            endsAt ?? _slotStart.AddHours(1),
            memberEmail
        );

    [Fact]
    public async Task BooksAnFreeSlot()
    {
        var result = await CreateUseCase().ExecuteAsync(Command(), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        var stored = _bookings.Bookings.Should().ContainSingle().Subject;
        stored.RoomId.Should().Be(_roomId);
        stored.MemberEmail.Should().Be("member@cowork.test");
        stored.Status.Should().Be(BookingStatus.Booked);
        stored.CreatedAt.Should().Be(_now);
    }

    [Fact]
    public async Task RefusesASlotThatEndsBeforeItStarts()
    {
        var result = await CreateUseCase()
            .ExecuteAsync(
                Command(startsAt: _slotStart.AddHours(1), endsAt: _slotStart),
                CancellationToken.None
            );

        result.IsFailed.Should().BeTrue();
        var error = result.Errors.OfType<AppError>().Single();
        error.Code.Should().Be("validation.failed");
        error.FieldErrors.Should().ContainKey("EndsAt");
    }

    [Fact]
    public async Task RefusesABookingThatStartsInThePast()
    {
        var result = await CreateUseCase()
            .ExecuteAsync(Command(startsAt: _now.AddMinutes(-1)), CancellationToken.None);

        var error = result.Errors.OfType<AppError>().Single();
        error.Code.Should().Be("time.in_past");
        _bookings.Bookings.Should().BeEmpty();
    }

    [Fact]
    public async Task RefusesABookingForAnUnknownRoom()
    {
        var result = await CreateUseCase()
            .ExecuteAsync(Command(roomId: Guid.NewGuid()), CancellationToken.None);

        var error = result.Errors.OfType<AppError>().Single();
        error.Code.Should().Be("room.not_found");
    }

    [Fact]
    public async Task RefusesAnOverlappingSlotOnTheSameRoom()
    {
        var useCase = CreateUseCase();
        (await useCase.ExecuteAsync(Command(), CancellationToken.None)).IsSuccess.Should().BeTrue();

        var result = await useCase.ExecuteAsync(
            Command(startsAt: _slotStart.AddMinutes(30)),
            CancellationToken.None
        );

        var error = result.Errors.OfType<AppError>().Single();
        error.Code.Should().Be("booking.slot_taken");
    }

    [Fact]
    public async Task AllowsABookingThatStartsExactlyWhenAnotherEnds()
    {
        var useCase = CreateUseCase();
        (await useCase.ExecuteAsync(Command(), CancellationToken.None)).IsSuccess.Should().BeTrue();

        var result = await useCase.ExecuteAsync(
            Command(startsAt: _slotStart.AddHours(1), endsAt: _slotStart.AddHours(2)),
            CancellationToken.None
        );

        result.IsSuccess.Should().BeTrue();
    }
}
