using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RoomBooking.Api.Modules.Bookings.Domain;

namespace RoomBooking.Api.Modules.Bookings.Infrastructure.Persistence;

public sealed class BookingConfiguration : IEntityTypeConfiguration<Booking>
{
    public void Configure(EntityTypeBuilder<Booking> builder)
    {
        builder.ToTable("bookings");
        builder.HasKey(booking => booking.Id);
        builder.Property(booking => booking.Id).HasColumnName("id").ValueGeneratedNever();
        builder.Property(booking => booking.RoomId).HasColumnName("room_id");
        builder.Property(booking => booking.MemberId).HasColumnName("member_id");
        builder.Property(booking => booking.Start).HasColumnName("starts_at");
        builder.Property(booking => booking.End).HasColumnName("ends_at");
        builder
            .Property(booking => booking.Status)
            .HasColumnName("status")
            .HasConversion<int>()
            // Concurrent transitions lose cleanly: the loser's save sees the winner's status.
            .IsConcurrencyToken();
        builder.Property(booking => booking.CheckInAt).HasColumnName("check_in_at");
        builder.Property(booking => booking.ReminderSentAt).HasColumnName("reminder_sent_at");
        builder.Property(booking => booking.HeldUntil).HasColumnName("held_until");
        builder.Property(booking => booking.CreatedAt).HasColumnName("created_at");
        builder.HasIndex(booking => booking.MemberId).HasDatabaseName("bookings_member_id");
        builder.HasIndex(booking => booking.Start).HasDatabaseName("bookings_starts_at");
    }
}
