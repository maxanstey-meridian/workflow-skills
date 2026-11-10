namespace Cowork.Api.Contracts.Rooms;

public sealed record CreateRoomRequest(string Name, int Capacity);

public sealed record RoomResponse(Guid Id, string Name, int Capacity);
