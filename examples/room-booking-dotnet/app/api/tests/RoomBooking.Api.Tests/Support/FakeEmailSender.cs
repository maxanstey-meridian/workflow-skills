using RoomBooking.Api.Modules.Bookings.Application.Ports;

namespace RoomBooking.Api.Tests.Support;

/// <summary>Records every email the app would have sent; the recorded list is the assertion.</summary>
public sealed class FakeEmailSender : IEmailSender
{
    public List<EmailMessage> Sent { get; } = [];

    public Task SendAsync(EmailMessage message, CancellationToken cancellationToken)
    {
        Sent.Add(message);
        return Task.CompletedTask;
    }
}
