namespace Cowork.Api.Contracts.Rooms;

public sealed record AddRoomRequest(string Name, int Capacity);

public sealed record AddRoomResponse(Guid Id, string Name, int Capacity);

public sealed record RoomResponse(Guid Id, string Name, int Capacity);

public sealed record RoomLimitsResponse(int NameMaxLength, int CapacityMin, int CapacityMax);

public sealed record RoomsResponse(IReadOnlyList<RoomResponse> Rooms, RoomLimitsResponse Limits);
