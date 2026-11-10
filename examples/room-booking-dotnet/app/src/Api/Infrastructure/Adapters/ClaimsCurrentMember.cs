using System.Security.Claims;
using Cowork.Api.Modules.Bookings.Application.Ports;

namespace Cowork.Api.Infrastructure.Adapters;

/// <summary>Resolves the acting member from the authenticated caller's claims.</summary>
public sealed class ClaimsCurrentMember(IHttpContextAccessor httpContextAccessor) : ICurrentMember
{
    public Guid MemberId
    {
        get
        {
            var claim = httpContextAccessor.HttpContext?.User.FindFirstValue(
                ClaimTypes.NameIdentifier
            );
            return Guid.TryParse(claim, out var id) ? id : Guid.Empty;
        }
    }
}
