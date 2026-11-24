using Cowork.Api.Modules.Bookings.Domain;

namespace Cowork.Api.Modules.Bookings.Application;

/// <summary>The shared result of a state-changing action on one booking.</summary>
public sealed record BookingUpdatedResult(Guid Id, BookingStatus Status);
