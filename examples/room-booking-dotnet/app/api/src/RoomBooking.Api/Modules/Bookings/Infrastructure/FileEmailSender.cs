using System.Text.Json;
using RoomBooking.Api.Modules.Bookings.Application.Ports;

namespace RoomBooking.Api.Modules.Bookings.Infrastructure;

/// <summary>
/// Development email adapter: writes each message as a JSON file under the
/// configured outbox directory so a person can inspect what the reminder sweep
/// sent. A production deployment swaps in its SMTP adapter for the same port.
/// </summary>
public sealed class FileEmailSender(ILogger<FileEmailSender> logger) : IEmailSender
{
    public async Task SendAsync(EmailMessage message, CancellationToken ct)
    {
        var directory = Path.Combine(AppContext.BaseDirectory, "email-out");
        Directory.CreateDirectory(directory);
        var file = Path.Combine(directory, $"{Guid.CreateVersion7():N}.json");
        var envelope = new
        {
            message.To,
            message.Subject,
            message.Body,
        };
        await File.WriteAllTextAsync(file, JsonSerializer.Serialize(envelope), ct);
        logger.LogInformation(
            "Reminder email written to {File}: to {To}: {Subject}",
            file,
            message.To,
            message.Subject
        );
    }
}
