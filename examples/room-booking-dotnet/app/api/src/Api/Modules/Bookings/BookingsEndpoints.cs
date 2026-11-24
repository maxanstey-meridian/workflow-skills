using System.Security.Claims;
using Cowork.Api.Common;
using Cowork.Api.Contracts.Bookings;
using Cowork.Api.Modules.Bookings.Application.BookRoom;
using Cowork.Api.Modules.Bookings.Application.CancelBooking;
using Cowork.Api.Modules.Bookings.Application.CheckInBooking;
using Cowork.Api.Modules.Bookings.Application.ListAvailableRooms;
using Cowork.Api.Modules.Bookings.Application.ListMyBookings;
using Rivet;

namespace Cowork.Api.Modules.Bookings;

public static class BookingsEndpoints
{
    public static IEndpointRouteBuilder MapBookingsEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost(
                BookingsContract.Book.Route,
                async (
                    BookRoomRequest request,
                    BookRoomUseCase bookRoom,
                    ClaimsPrincipal user,
                    CancellationToken cancellationToken
                ) =>
                {
                    var endpoint = BookingsContract.Book.Bind(request);
                    var command = new BookRoomCommand(
                        request.RoomId,
                        request.StartsAt,
                        request.EndsAt,
                        MemberEmail(user)
                    );
                    var result = await bookRoom.ExecuteAsync(command, cancellationToken);
                    if (result.IsSuccess)
                    {
                        return endpoint.Success(new BookRoomResponse(result.Value.Id)).ToResult();
                    }

                    return result.ToErrorResult(endpoint).ToResult();
                }
            )
            .RequireAuthorization(AuthPolicies.Member);

        app.MapGet(
                BookingsContract.ListMine.Route,
                async (
                    ListMyBookingsQuery listMine,
                    ClaimsPrincipal user,
                    TimeProvider time,
                    CancellationToken cancellationToken
                ) =>
                {
                    var bookings = await listMine.ExecuteAsync(
                        MemberEmail(user),
                        time.GetUtcNow(),
                        cancellationToken
                    );
                    return BookingsContract
                        .ListMine.Success(
                            new MyBookingsResponse([
                                .. bookings.Select(b => new BookingResponse(
                                    b.Id,
                                    b.RoomId,
                                    b.RoomName,
                                    b.StartsAt,
                                    b.EndsAt,
                                    (BookingStatusValue)b.Status,
                                    [.. b.AvailableActions.Select(a => (BookingActionValue)a)]
                                )),
                            ])
                        )
                        .ToResult();
                }
            )
            .RequireAuthorization(AuthPolicies.Member);

        app.MapPost(
                BookingsContract.Cancel.Route,
                async (
                    Guid id,
                    CancelBookingUseCase cancel,
                    ClaimsPrincipal user,
                    CancellationToken cancellationToken
                ) =>
                {
                    var result = await cancel.ExecuteAsync(
                        new CancelBookingCommand(id, MemberEmail(user)),
                        cancellationToken
                    );
                    if (result.IsSuccess)
                    {
                        return BookingsContract
                            .Cancel.Success(
                                new BookingStateResponse(
                                    result.Value.Id,
                                    (BookingStatusValue)result.Value.Status
                                )
                            )
                            .ToResult();
                    }

                    return result.ToErrorResult(BookingsContract.Cancel).ToResult();
                }
            )
            .RequireAuthorization(AuthPolicies.Member);

        app.MapPost(
                BookingsContract.CheckIn.Route,
                async (
                    Guid id,
                    CheckInBookingUseCase checkIn,
                    ClaimsPrincipal user,
                    CancellationToken cancellationToken
                ) =>
                {
                    var result = await checkIn.ExecuteAsync(
                        new CheckInBookingCommand(id, MemberEmail(user)),
                        cancellationToken
                    );
                    if (result.IsSuccess)
                    {
                        return BookingsContract
                            .CheckIn.Success(
                                new BookingStateResponse(
                                    result.Value.Id,
                                    (BookingStatusValue)result.Value.Status
                                )
                            )
                            .ToResult();
                    }

                    return result.ToErrorResult(BookingsContract.CheckIn).ToResult();
                }
            )
            .RequireAuthorization(AuthPolicies.Member);

        app.MapGet(
            BookingsContract.AvailableRooms.Route,
            async (
                [AsParameters] AvailableRoomsRequest request,
                ListAvailableRoomsQuery listAvailable,
                CancellationToken cancellationToken
            ) =>
            {
                var endpoint = BookingsContract.AvailableRooms.Bind(request);
                var rooms = await listAvailable.ExecuteAsync(
                    request.StartsAt,
                    request.EndsAt,
                    cancellationToken
                );
                return endpoint
                    .Success(
                        new AvailableRoomsResponse([
                            .. rooms.Select(r => new AvailableRoomResponse(
                                r.Id,
                                r.Name,
                                r.Capacity
                            )),
                        ])
                    )
                    .ToResult();
            }
        );

        return app;
    }

    private static string MemberEmail(ClaimsPrincipal user) =>
        user.FindFirstValue(ClaimTypes.Email)
        ?? throw new InvalidOperationException(
            "An authenticated user reached a member endpoint without an email claim."
        );
}
