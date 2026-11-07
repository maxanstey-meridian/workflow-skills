using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RoomBooking.Api.Kernel;
using RoomBooking.Api.Modules.Bookings.Application;
using RoomBooking.Api.Persistence;
using RoomBooking.Tests.Support;

namespace RoomBooking.Tests.Bookings;

[Collection("postgres")]
public sealed class ReminderSweepTests(PostgresFixture db)
{
    private static readonly DateTime BookingDay = new(2026, 11, 12, 9, 0, 0, DateTimeKind.Utc);
    private static readonly DateTime EveningBefore = new(2026, 11, 11, 18, 0, 0, DateTimeKind.Utc);

    // The business zone in tests is UTC, so the run window opens exactly at
    // SendRemindersAtLocal and Spread applies on top of it.
    private static readonly TimeZoneInfo Zone = TimeZoneInfo.Utc;

    private async Task<Guid> BookedTomorrowAsync(
        IServiceProvider services,
        int memberSeed,
        string email
    )
    {
        var added = await services
            .GetRequiredService<AddRoom>()
            .ExecuteAsync("Focus Room", 4, TestHost.Staff, CancellationToken.None);
        var actor = new Actor(
            new Guid($"01940000-0000-7000-0000-{memberSeed & 0xFFFFFFFFFFFF:X12}"),
            "Member",
            email,
            ActorRole.Member
        );
        var booking = await services
            .GetRequiredService<BookRoom>()
            .ExecuteAsync(
                added.Value.RoomId,
                BookingDay,
                BookingDay.AddHours(1),
                actor,
                CancellationToken.None
            );
        Assert.True(booking.IsSuccess);
        return booking.Value.Id;
    }

    [Fact]
    public async Task Reminders_go_out_the_evening_before_with_the_members_email()
    {
        await db.ResetAsync();
        var emails = new RecordingEmailSender();
        var clock = TestHost.Clock(new DateTimeOffset(EveningBefore.AddMinutes(31), TimeSpan.Zero));
        await TestHost.WithScope(
            db,
            clock,
            emails,
            async services =>
            {
                var bookingId = await BookedTomorrowAsync(
                    services,
                    memberSeed: 0x0bb1,
                    email: "mia@test.example"
                );
                var sent = await services
                    .GetRequiredService<SendBookingReminders>()
                    .ExecuteAsync(clock.GetUtcNow().UtcDateTime, Zone, CancellationToken.None);

                Assert.Equal(1, sent);
                var email = Assert.Single(emails.Sent);
                Assert.Equal("mia@test.example", email.To);
                Assert.Contains("Focus Room", email.Subject);
                Assert.Contains("09:00", email.Body);
                await ReminderAssertions.AssertReminderMarkedAsync(db, bookingId);
            }
        );
    }

    [Fact]
    public async Task Each_booking_has_its_own_spread_slot_inside_the_window()
    {
        await db.ResetAsync();
        var emails = new RecordingEmailSender();
        var a = SendBookingReminders.Spread(Guid.NewGuid());
        Assert.True(a >= TimeSpan.Zero && a < SendBookingReminders.SendSpreadWindow);
        await TestHost.WithScope(
            db,
            TestHost.Clock(new DateTimeOffset(EveningBefore, TimeSpan.Zero)),
            emails,
            async services =>
            {
                var bookingId = await BookedTomorrowAsync(
                    services,
                    memberSeed: 0x0bb2,
                    email: "kai@test.example"
                );
                var slot = SendBookingReminders.Spread(bookingId);

                // Just before the booking's slot: nothing yet.
                var before = await services
                    .GetRequiredService<SendBookingReminders>()
                    .ExecuteAsync(
                        (
                            new DateTimeOffset(EveningBefore, TimeSpan.Zero)
                            + slot
                            - TimeSpan.FromSeconds(1)
                        ).UtcDateTime,
                        Zone,
                        CancellationToken.None
                    );
                Assert.Equal(0, before);
                Assert.Empty(emails.Sent);

                // Just after: out it goes.
                var after = await services
                    .GetRequiredService<SendBookingReminders>()
                    .ExecuteAsync(
                        (
                            new DateTimeOffset(EveningBefore, TimeSpan.Zero)
                            + slot
                            + TimeSpan.FromSeconds(1)
                        ).UtcDateTime,
                        Zone,
                        CancellationToken.None
                    );
                Assert.Equal(1, after);
                Assert.Single(emails.Sent);
            }
        );
    }

    [Fact]
    public async Task A_rerun_never_sends_twice()
    {
        await db.ResetAsync();
        var emails = new RecordingEmailSender();
        var lateWindow = TestHost.Clock(
            new DateTimeOffset(EveningBefore.AddHours(1), TimeSpan.Zero)
        );
        await TestHost.WithScope(
            db,
            lateWindow,
            emails,
            async services =>
            {
                var bookingId = await BookedTomorrowAsync(
                    services,
                    memberSeed: 0x0bb3,
                    email: "mia@test.example"
                );
                var first = await services
                    .GetRequiredService<SendBookingReminders>()
                    .ExecuteAsync(lateWindow.GetUtcNow().UtcDateTime, Zone, CancellationToken.None);
                Assert.Equal(1, first);

                // A rerun of the sweep — as after a crash mid-window — sees every
                // reminder already marked and sends nothing more.
                emails.Sent.Clear();
                var second = await services
                    .GetRequiredService<SendBookingReminders>()
                    .ExecuteAsync(
                        lateWindow.GetUtcNow().AddMinutes(5).UtcDateTime,
                        Zone,
                        CancellationToken.None
                    );
                Assert.Equal(0, second);
                Assert.Empty(emails.Sent);
                await ReminderAssertions.AssertReminderMarkedAsync(db, bookingId);
            }
        );
    }

    [Fact]
    public async Task Cancelled_and_same_day_bookings_get_no_reminder()
    {
        await db.ResetAsync();
        var emails = new RecordingEmailSender();
        var clock = TestHost.Clock(new DateTimeOffset(EveningBefore.AddHours(1), TimeSpan.Zero));
        await TestHost.WithScope(
            db,
            clock,
            emails,
            async services =>
            {
                var added = await services
                    .GetRequiredService<AddRoom>()
                    .ExecuteAsync("Focus Room", 4, TestHost.Staff, CancellationToken.None);

                var tomorrow = await services
                    .GetRequiredService<BookRoom>()
                    .ExecuteAsync(
                        added.Value.RoomId,
                        BookingDay,
                        BookingDay.AddHours(1),
                        TestHost.MemberMia,
                        CancellationToken.None
                    );
                await services
                    .GetRequiredService<CancelBooking>()
                    .ExecuteAsync(tomorrow.Value.Id, TestHost.MemberMia, CancellationToken.None);

                var today = await services
                    .GetRequiredService<BookRoom>()
                    .ExecuteAsync(
                        added.Value.RoomId,
                        new DateTime(2026, 11, 11, 21, 0, 0, DateTimeKind.Utc),
                        new DateTime(2026, 11, 11, 22, 0, 0, DateTimeKind.Utc),
                        TestHost.MemberMia,
                        CancellationToken.None
                    );
                Assert.True(today.IsSuccess);

                var sent = await services
                    .GetRequiredService<SendBookingReminders>()
                    .ExecuteAsync(clock.GetUtcNow().UtcDateTime, Zone, CancellationToken.None);
                Assert.Equal(0, sent);
                Assert.Empty(emails.Sent);
            }
        );
    }
}

public static class ReminderAssertions
{
    public static async Task AssertReminderMarkedAsync(PostgresFixture db, Guid bookingId)
    {
        var options = new DbContextOptionsBuilder<BookingDbContext>()
            .UseNpgsql(db.ConnectionString)
            .Options;
        await using var probe = new BookingDbContext(options);
        var row = await probe.Bookings.SingleAsync(b => b.Id == bookingId);
        Assert.NotNull(row.ReminderSentAtUtc);
    }
}
