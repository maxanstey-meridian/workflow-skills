namespace RoomBooking.Api.Contracts.Rooms;

public sealed record AddRoomRequest(string Name, int Capacity);

public sealed record AddRoomResponse(Guid Id, string Name, int Capacity);

public sealed record RoomDto(Guid Id, string Name, int Capacity);

public sealed record RoomsResponse(IReadOnlyList<RoomDto> Rooms);
