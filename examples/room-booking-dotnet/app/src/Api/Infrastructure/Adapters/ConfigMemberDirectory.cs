using Cowork.Api.Modules.Bookings.Application.Ports;
using Microsoft.Extensions.Options;

namespace Cowork.Api.Infrastructure.Adapters;

/// <summary>Member contacts from the configured dev personas; a production deployment
/// swaps this adapter for the real identity provider.</summary>
public sealed class ConfigMemberDirectory(IOptions<DevUserOptions> users) : IMemberDirectory
{
    public Task<MemberContact?> FindByIdAsync(Guid memberId, CancellationToken cancellationToken)
    {
        var match = users.Value.Users.Values.FirstOrDefault(user => user.Id == memberId);
        return Task.FromResult<MemberContact?>(
            match is null ? null : new MemberContact(match.Id, match.Name, match.Email)
        );
    }
}
