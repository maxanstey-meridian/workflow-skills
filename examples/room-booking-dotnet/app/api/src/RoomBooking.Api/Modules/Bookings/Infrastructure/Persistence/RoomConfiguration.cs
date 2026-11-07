using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RoomBooking.Api.Modules.Bookings.Domain;

namespace RoomBooking.Api.Modules.Bookings.Infrastructure.Persistence;

public sealed class RoomConfiguration : IEntityTypeConfiguration<Room>
{
    public void Configure(EntityTypeBuilder<Room> builder)
    {
        builder.ToTable("rooms");
        builder.HasKey(r => r.Id);
        builder.Property(r => r.Id).HasColumnName("id");
        builder.Property(r => r.Name).HasColumnName("name").HasMaxLength(200);
        // The unique name is the authority behind a duplicate-name refusal.
        builder.HasIndex(r => r.Name).IsUnique();
        builder.Property(r => r.Capacity).HasColumnName("capacity");
        builder.Property(r => r.CreatedAtUtc).HasColumnName("created_at");
    }
}
