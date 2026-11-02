using FluentAssertions;
using RoomBooking.Api.Modules.Users.Application;
using RoomBooking.Api.Modules.Users.Domain;
using Xunit;

namespace RoomBooking.Api.Tests;

public sealed class SessionCapabilitiesTests
{
    [Fact]
    public void Staff_can_manage_rooms_but_not_book_them()
    {
        var capabilities = SessionCapabilities.For(UserRole.Staff);

        capabilities.CanManageRooms.Should().BeTrue();
        capabilities.CanBookRooms.Should().BeFalse();
    }

    [Fact]
    public void Members_can_book_rooms_but_not_manage_them()
    {
        var capabilities = SessionCapabilities.For(UserRole.Member);

        capabilities.CanBookRooms.Should().BeTrue();
        capabilities.CanManageRooms.Should().BeFalse();
    }
}
