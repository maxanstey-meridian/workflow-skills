using RoomBooking.Api.Host.DevAuthentication;

namespace RoomBooking.Api.Tests;

/// <summary>Http clients that act as a seeded user, via the dev authentication header.</summary>
public static class ActingAs
{
    public const string StaffEmail = "amara@roombooking.dev";

    public const string BenEmail = "ben@roombooking.dev";

    public const string DanaEmail = "dana@roombooking.dev";

    public static HttpClient Staff(this HttpClient client)
    {
        return AsUser(client, StaffEmail);
    }

    public static HttpClient Member(this HttpClient client, string email)
    {
        return AsUser(client, email);
    }

    private static HttpClient AsUser(HttpClient client, string email)
    {
        client.DefaultRequestHeaders.Add(DevAuthHandler.EmailHeaderName, email);
        return client;
    }
}
