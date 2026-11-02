using RoomBooking.Api.Modules.Bookings.Application.Ports;

namespace RoomBooking.Api.Modules.Bookings.Infrastructure;

/// <summary>Development adapter: no email leaves the machine, each one is logged.</summary>
public sealed class LoggingEmailSender(ILogger<LoggingEmailSender> logger) : IEmailSender
{
    public Task SendAsync(EmailMessage message, CancellationToken cancellationToken)
    {
        logger.LogInformation(
            "Email to {To}: {Subject}\n{Body}",
            message.To,
            message.Subject,
            message.Body
        );
        return Task.CompletedTask;
    }
}
