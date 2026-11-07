using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Rivet;
using RoomBooking.Api.Contracts.Identity;
using RoomBooking.Api.Modules.Identity.Application;

namespace RoomBooking.Api.Modules.Identity;

[ApiController]
public sealed class UsersController(ListUsers listUsers) : ControllerBase
{
    [HttpGet("/" + IdentityContract.ListUsersRoute)]
    [AllowAnonymous]
    public async Task<IActionResult> ListUsers(CancellationToken ct)
    {
        var users = await listUsers.ExecuteAsync(ct);
        return IdentityContract
            .ListUsers.Success(
                new UsersResponse([
                    .. users.Select(u => new UserView(u.Id, u.Name, u.Email, (UserRoleWire)u.Role)),
                ])
            )
            .ToActionResult();
    }
}
