using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using RoomBooking.Api.Kernel;
using RoomBooking.Api.Persistence;

namespace RoomBooking.Api.Auth;

/// <summary>
/// Development authentication: the bearer token is the seeded user's id, and
/// the handler signs that user in with their role. A production deployment
/// replaces this handler with a real credential scheme; the policies, the
/// [Authorize] wiring, and the use-case checks stay unchanged.
/// </summary>
public sealed class DevAuthenticationHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder,
    IServiceScopeFactory scopes
) : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string SchemeName = "Bearer";

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var authHeader = Request.Headers.Authorization.ToString();
        if (authHeader.Length == 0)
        {
            return AuthenticateResult.NoResult();
        }

        const string prefix = "Bearer ";
        if (!authHeader.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
        {
            return AuthenticateResult.NoResult();
        }

        var token = authHeader[prefix.Length..].Trim();
        if (!Guid.TryParse(token, out var userId))
        {
            return AuthenticateResult.Fail("A dev token must be a user id.");
        }

        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<BookingDbContext>();
        var user = await db.Users.AsNoTracking().SingleOrDefaultAsync(u => u.Id == userId);
        if (user is null)
        {
            return AuthenticateResult.Fail("Unknown dev user.");
        }

        var identity = new ClaimsIdentity(
            [
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.Name),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Role, user.Role.ToString()),
            ],
            Scheme.Name
        );

        return AuthenticateResult.Success(
            new AuthenticationTicket(new ClaimsPrincipal(identity), Scheme.Name)
        );
    }
}

public static class AuthorizationPolicies
{
    public const string StaffOnly = "StaffOnly";
    public const string MembersOnly = "MembersOnly";

    public static void Configure(AuthorizationOptions options)
    {
        options.FallbackPolicy = new AuthorizationPolicyBuilder(DevAuthenticationHandler.SchemeName)
            .RequireAuthenticatedUser()
            .Build();
        options.AddPolicy(StaffOnly, policy => policy.RequireRole(nameof(ActorRole.Staff)));
        options.AddPolicy(MembersOnly, policy => policy.RequireRole(nameof(ActorRole.Member)));
    }
}

public static class ActorAccessor
{
    /// <summary>The acting user as far as the request's claims go; null when the claims are malformed.</summary>
    public static Actor? RequireActor(this ControllerBase controller)
    {
        var id = controller.User.FindFirstValue(ClaimTypes.NameIdentifier);
        var name = controller.User.FindFirstValue(ClaimTypes.Name);
        var email = controller.User.FindFirstValue(ClaimTypes.Email);
        var role = controller.User.FindFirstValue(ClaimTypes.Role);
        if (
            id is null
            || name is null
            || email is null
            || role is null
            || !Guid.TryParse(id, out var userId)
        )
        {
            return null;
        }

        return Enum.TryParse<ActorRole>(role, out var parsed)
            ? new Actor(userId, name, email, parsed)
            : null;
    }
}
