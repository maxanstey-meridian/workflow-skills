using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;

namespace Cowork.Api.Infrastructure.Auth;

/// <summary>
/// Signs the caller in as the dev persona named by the X-Dev-User header. This is the
/// development stand-in for a real identity provider; a production deployment replaces
/// this handler and keeps every policy unchanged.
/// </summary>
public sealed class DevAuthenticationHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> schemeOptions,
    IOptionsMonitor<DevUserOptions> users,
    ILoggerFactory logger,
    UrlEncoder encoder
) : AuthenticationHandler<AuthenticationSchemeOptions>(schemeOptions, logger, encoder)
{
    public const string SchemeName = "Dev";
    public const string HeaderName = "X-Dev-User";

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var key = Request.Headers[HeaderName].FirstOrDefault();
        if (key is null || !users.CurrentValue.Users.TryGetValue(key, out var user))
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, user.Name),
            new(ClaimTypes.Email, user.Email),
            new(ClaimTypes.Role, user.Role),
        };
        var identity = new ClaimsIdentity(claims, SchemeName);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, SchemeName);
        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
