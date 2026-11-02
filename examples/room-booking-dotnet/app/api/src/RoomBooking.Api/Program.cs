using RoomBooking.Api.Host;
using RoomBooking.Api.Modules.Bookings;
using RoomBooking.Api.Modules.Rooms;
using RoomBooking.Api.Modules.Users;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddHost(builder.Configuration);

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    // The SPA on http://localhost:3000 calls this API during development.
    app.UseCors();
}

app.UseExceptionHandler();
app.UseAuthentication();
app.UseAuthorization();

// Literal bootstrap handler, the one endpoint outside the contracts.
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

app.MapUsersEndpoints();
app.MapRoomsEndpoints();
app.MapBookingsEndpoints();

await Composition.InitializeAsync(app);

app.Run();

public partial class Program;
