using System.Security.Claims;
using System.Text.Encodings.Web;
using Cowork.Api.Common;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;

namespace Cowork.Api.Auth;

/// <summary>
/// The development identity mechanism: the caller names a persona in the
/// X-Dev-User header as "&lt;role&gt;:&lt;email&gt;", e.g. "staff:maya@cowork.test"
/// or "member:alex@cowork.test", and is signed in with that identity.
/// </summary>
public sealed class DevAuthenticationHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder
) : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string HeaderName = "X-Dev-User";
    public const string SchemeName = "Dev";

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue(HeaderName, out var header))
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        var identity = Parse(header.ToString(), Scheme.Name);
        return Task.FromResult(
            identity is null
                ? AuthenticateResult.Fail(
                    $"{HeaderName} must be '<role>:<email>' with role {AuthRoles.Staff} or {AuthRoles.Member}."
                )
                : AuthenticateResult.Success(
                    new AuthenticationTicket(new ClaimsPrincipal(identity), Scheme.Name)
                )
        );
    }

    private static ClaimsIdentity? Parse(string header, string authenticationScheme)
    {
        var parts = header.Split(':', 2);
        if (parts.Length != 2)
        {
            return null;
        }

        var (role, email) = (parts[0].Trim(), parts[1].Trim());
        if (role is not (AuthRoles.Staff or AuthRoles.Member) || !email.Contains('@'))
        {
            return null;
        }

        return new ClaimsIdentity(
            [
                new Claim(ClaimTypes.NameIdentifier, email),
                new Claim(ClaimTypes.Email, email),
                new Claim(ClaimTypes.Role, role),
            ],
            authenticationScheme
        );
    }
}
