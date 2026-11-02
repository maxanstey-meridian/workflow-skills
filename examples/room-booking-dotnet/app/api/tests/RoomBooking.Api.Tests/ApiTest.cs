using Xunit;

namespace RoomBooking.Api.Tests;

[Collection("Api")]
public abstract class ApiTest : IAsyncLifetime
{
    protected ApiTest(ApiTestFixture fixture)
    {
        Fixture = fixture;
    }

    protected ApiTestFixture Fixture { get; }

    public async ValueTask InitializeAsync()
    {
        await Fixture.ResetAsync();
    }

    public ValueTask DisposeAsync()
    {
        return ValueTask.CompletedTask;
    }
}
