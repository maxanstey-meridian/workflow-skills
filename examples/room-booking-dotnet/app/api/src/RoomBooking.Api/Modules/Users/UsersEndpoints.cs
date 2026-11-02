using System.Diagnostics;
using System.Security.Claims;
using Rivet;
using RoomBooking.Api.Contracts.Users;
using RoomBooking.Api.Modules.Users.Application;
using RoomBooking.Api.Modules.Users.Contracts;

namespace RoomBooking.Api.Modules.Users;

public static class UsersEndpoints
{
    public static IEndpointRouteBuilder MapUsersEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet(
                UsersContract.Session.Route,
                async (
                    ClaimsPrincipal principal,
                    GetSessionQuery session,
                    CancellationToken cancellationToken
                ) =>
                {
                    var endpoint = UsersContract.Session;
                    var actorId = Guid.Parse(principal.FindFirstValue(ClaimTypes.NameIdentifier)!);
                    var snapshot = await session.ExecuteAsync(actorId, cancellationToken);
                    return snapshot is null
                        ? endpoint.Error(StatusCodes.Status401Unauthorized).ToResult()
                        : endpoint.Success(ToResponse(snapshot)).ToResult();
                }
            )
            .RequireAuthorization("Authenticated");

        app.MapGet(
                UsersContract.List.Route,
                async (ListUsersQuery listUsers, CancellationToken cancellationToken) =>
                {
                    var endpoint = UsersContract.List;
                    var users = await listUsers.ExecuteAsync(role: null, cancellationToken);
                    return endpoint
                        .Success(new UsersResponse(users.Select(ToDto).ToList()))
                        .ToResult();
                }
            )
            .RequireAuthorization("Authenticated");

        return app;
    }

    private static SessionResponse ToResponse(SessionSnapshot snapshot)
    {
        return new SessionResponse(
            ToDto(snapshot.User),
            new CapabilitiesDto(
                snapshot.Capabilities.CanManageRooms,
                snapshot.Capabilities.CanBookRooms
            )
        );
    }

    private static UserDto ToDto(UserSnapshot user)
    {
        return new UserDto(user.Id, user.Name, user.Email, MapRole(user.Role));
    }

    private static UserRole MapRole(Domain.UserRole role)
    {
        return role switch
        {
            Domain.UserRole.Staff => UserRole.Staff,
            Domain.UserRole.Member => UserRole.Member,
            _ => throw new UnreachableException($"Unhandled user role '{role}'."),
        };
    }
}
