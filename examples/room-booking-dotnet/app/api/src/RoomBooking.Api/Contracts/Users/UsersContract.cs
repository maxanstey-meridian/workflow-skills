using Rivet;

namespace RoomBooking.Api.Contracts.Users;

[RivetContract]
public static class UsersContract
{
    public const string SessionRoute = "/api/session";

    public const string ListRoute = "/api/users";

    public static readonly RouteDefinition<SessionResponse> Session = Define
        .Get<SessionResponse>(SessionRoute)
        .Description("The acting user and what they can do.")
        .Returns(401, "The acting user is not signed in.");

    public static readonly RouteDefinition<UsersResponse> List = Define
        .Get<UsersResponse>(ListRoute)
        .Description("Every user, for choosing who to act as.");
}
