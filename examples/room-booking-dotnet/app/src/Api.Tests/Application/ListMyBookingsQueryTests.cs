using Cowork.Api.Infrastructure.Adapters;
using Cowork.Api.Modules.Bookings.Application.ListMyBookings;
using Cowork.Api.Modules.Bookings.Domain;
using Cowork.Api.Tests.TestSupport.Fakes;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;

namespace Cowork.Api.Tests.Application;

public sealed class ListMyBookingsQueryTests
{
    private static readonly Guid RoomId = new("11111111-1111-1111-1111-111111111111");
    private static readonly Guid OtherRoomId = new("55555555-5555-5555-5555-555555555555");
    private static readonly Guid MemberId = new("22222222-2222-2222-2222-222222222222");
    private static readonly DateTimeOffset Now = new(2026, 11, 10, 12, 0, 0, TimeSpan.Zero);

    [Fact]
    public async Task A_member_sees_only_their_own_bookings_with_room_names_and_actions()
    {
        var bookings = new FakeBookingRepository();
        var rooms = new FakeRoomDirectory().Seed(
            new RoomSummary(RoomId, "Focus Room", 4),
            new RoomSummary(OtherRoomId, "Team Table", 8)
        );
        bookings.Seed(
            Booking.Create(RoomId, MemberId, Now.AddDays(1), Now.AddDays(1).AddHours(1)),
            Booking.Create(OtherRoomId, MemberId, Now.AddDays(2), Now.AddDays(2).AddHours(1)),
            Booking.Create(RoomId, Guid.NewGuid(), Now.AddDays(3), Now.AddDays(3).AddHours(1))
        );

        var query = new ListMyBookingsQuery(
            bookings,
            rooms,
            new SpaceClock(
                new FakeTimeProvider(Now),
                Options.Create(
                    new SpaceOptions { TimeZoneId = "Europe/London", ReminderEveningHour = 18 }
                )
            ),
            new FixedCurrentMember(MemberId)
        );

        var views = await query.ExecuteAsync(CancellationToken.None);

        views.Should().HaveCount(2);
        views.Select(view => view.RoomName).Should().Equal("Focus Room", "Team Table");
        views[0]
            .AvailableActions.Should()
            .Contain(action => action.Action == BookingAction.Cancel && action.Enabled);
    }
}
