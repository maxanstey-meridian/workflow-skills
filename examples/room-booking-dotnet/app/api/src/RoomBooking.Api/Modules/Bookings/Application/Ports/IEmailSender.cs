namespace RoomBooking.Api.Modules.Bookings.Application.Ports;

public sealed record EmailMessage(string To, string Subject, string Body);

public interface IEmailSender
{
    public Task SendAsync(EmailMessage message, CancellationToken cancellationToken);
}
