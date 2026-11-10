using Cowork.Api.Modules.Bookings.Application.Ports;

namespace Cowork.Api.Infrastructure.Adapters;

/// <summary>
/// Development stand-in for a real email sender: it writes each message to the log.
/// A production deployment swaps this adapter for SMTP or a provider SDK; no caller
/// changes.
/// </summary>
public sealed class LoggedBookingReminders(ILogger<LoggedBookingReminders> logger)
    : IBookingReminders
{
    public Task SendAsync(
        string email,
        string subject,
        string body,
        CancellationToken cancellationToken
    )
    {
        logger.LogInformation("Email to {Email}: {Subject}\n{Body}", email, subject, body);
        return Task.CompletedTask;
    }
}
