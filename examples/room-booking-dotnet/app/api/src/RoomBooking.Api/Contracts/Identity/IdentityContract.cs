using System.Text.Json.Serialization;
using Rivet;

namespace RoomBooking.Api.Contracts.Identity;

[JsonConverter(typeof(RivetKebabCaseEnumConverter<UserRoleWire>))]
public enum UserRoleWire
{
    Staff,
    Member,
}

public sealed record UserView(Guid Id, string Name, string Email, UserRoleWire Role);

public sealed record UsersResponse(IReadOnlyList<UserView> Users);

[RivetContract]
public static class IdentityContract
{
    public const string ListUsersRoute = "/api/users";

    public static readonly RouteDefinition<UsersResponse> ListUsers = Define
        .Get<UsersResponse>(ListUsersRoute)
        .Anonymous();
}
