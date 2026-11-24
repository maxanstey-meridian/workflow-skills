using Cowork.Api.Tests.TestSupport;

namespace Cowork.Api.Tests.Integration;

public sealed class InMemoryBookingRepositoryBehaviorTests : BookingRepositoryBehaviorTests
{
    private readonly InMemoryBookingRepository _repository = new();

    protected override Task<BookingRepository> CreateRepositoryAsync() =>
        Task.FromResult<BookingRepository>(_repository);
}
