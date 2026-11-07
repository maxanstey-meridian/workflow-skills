using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RoomBooking.Api.Modules.Bookings.Domain;

namespace RoomBooking.Api.Modules.Bookings.Infrastructure.Persistence;

public sealed class BookingConfiguration : IEntityTypeConfiguration<Booking>
{
    public void Configure(EntityTypeBuilder<Booking> builder)
    {
        builder.ToTable("bookings");
        builder.HasKey(b => b.Id);
        builder.Property(b => b.Id).HasColumnName("id");
        builder.Property(b => b.RoomId).HasColumnName("room_id");
        builder.Property(b => b.MemberId).HasColumnName("member_id");
        builder.Property(b => b.MemberEmail).HasColumnName("member_email").HasMaxLength(320);
        builder.Property(b => b.StartUtc).HasColumnName("start_utc");
        builder.Property(b => b.EndUtc).HasColumnName("end_utc");
        builder.Property(b => b.CreatedAtUtc).HasColumnName("created_at");
        builder.Property(b => b.Status).HasColumnName("status").HasConversion<string>();
        builder.Property(b => b.ReminderSentAtUtc).HasColumnName("reminder_sent_at");

        builder
            .HasOne(b => b.Room)
            .WithMany()
            .HasForeignKey(b => b.RoomId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
