using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Primitives;
using RoomBooking.Api.Modules.Users.Contracts;

namespace RoomBooking.Api.Host.DevAuthentication;

/// <summary>
///     Development authentication: the acting user is named by the X-User-Email header and signed
///     in without credentials. Unknown or missing emails produce no principal, so endpoints then
///     return 401. Where real authentication would slot in: replace this scheme.
/// </summary>
public sealed class DevAuthHandler(
    IUserDirectory users,
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder
) : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string SchemeName = "DevUser";

    public const string EmailHeaderName = "X-User-Email";

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (
            !Request.Headers.TryGetValue(EmailHeaderName, out var email)
            || StringValues.IsNullOrEmpty(email)
        )
        {
            return AuthenticateResult.NoResult();
        }

        var user = await users.FindByEmailAsync(email.ToString(), Context.RequestAborted);
        if (user is null)
        {
            return AuthenticateResult.NoResult();
        }

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Email, user.Email),
            new(ClaimTypes.Role, user.Role.ToString()),
        };
        var identity = new ClaimsIdentity(claims, SchemeName);
        var ticket = new AuthenticationTicket(new ClaimsPrincipal(identity), SchemeName);
        return AuthenticateResult.Success(ticket);
    }
}
