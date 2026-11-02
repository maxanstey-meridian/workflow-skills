using System.Text.Json.Serialization;
using Rivet;

namespace RoomBooking.Api.Contracts.Users;

[JsonConverter(typeof(RivetCamelCaseEnumConverter<UserRole>))]
public enum UserRole
{
    Staff,
    Member,
}

public sealed record UserDto(Guid Id, string Name, string Email, UserRole Role);

public sealed record CapabilitiesDto(bool CanManageRooms, bool CanBookRooms);

public sealed record SessionResponse(UserDto User, CapabilitiesDto Capabilities);

public sealed record UsersResponse(IReadOnlyList<UserDto> Users);
