using Microsoft.EntityFrameworkCore;
using Npgsql;
using RoomBooking.Api.Host.Persistence;
using RoomBooking.Api.Modules.Rooms.Application.Ports;
using RoomBooking.Api.Modules.Rooms.Domain;

namespace RoomBooking.Api.Modules.Rooms.Infrastructure;

public sealed class RoomRepository(RoomBookingDbContext db) : IRoomRepository
{
    public async Task AddAsync(Room room, CancellationToken cancellationToken)
    {
        db.Rooms.Add(room);
        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception)
            when (exception.InnerException
                    is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation }
            )
        {
            throw new RoomNameTakenException(room.Name, exception);
        }
    }
}
