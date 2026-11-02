using System.Diagnostics;
using RoomBooking.Api.Modules.Users.Domain;

namespace RoomBooking.Api.Modules.Users.Application;

public sealed record SessionCapabilities(bool CanManageRooms, bool CanBookRooms)
{
    public static SessionCapabilities For(UserRole role)
    {
        return role switch
        {
            UserRole.Staff => new SessionCapabilities(CanManageRooms: true, CanBookRooms: false),
            UserRole.Member => new SessionCapabilities(CanManageRooms: false, CanBookRooms: true),
            _ => throw new UnreachableException($"Unhandled user role '{role}'."),
        };
    }
}
