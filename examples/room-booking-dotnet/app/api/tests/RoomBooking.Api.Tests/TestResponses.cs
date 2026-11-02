using System.Text.Json;

namespace RoomBooking.Api.Tests;

public static class TestResponses
{
    public static async Task<JsonElement> ReadJsonAsync(this HttpResponseMessage response)
    {
        var content = await response.Content.ReadAsStringAsync();
        using var document = JsonDocument.Parse(content);
        return document.RootElement.Clone();
    }
}
