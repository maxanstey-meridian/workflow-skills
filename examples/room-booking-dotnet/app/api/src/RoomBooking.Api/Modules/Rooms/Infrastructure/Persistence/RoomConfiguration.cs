using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RoomBooking.Api.Modules.Rooms.Domain;

namespace RoomBooking.Api.Modules.Rooms.Infrastructure.Persistence;

public sealed class RoomConfiguration : IEntityTypeConfiguration<Room>
{
    public void Configure(EntityTypeBuilder<Room> builder)
    {
        builder.ToTable("rooms");
        builder.HasKey(room => room.Id);
        builder.Property(room => room.Id).HasColumnName("id").ValueGeneratedNever();
        builder.Property(room => room.Name).HasColumnName("name").HasMaxLength(100).IsRequired();
        builder.Property(room => room.Capacity).HasColumnName("capacity");
        builder.Property(room => room.CreatedAt).HasColumnName("created_at");
        builder.HasIndex(room => room.Name).IsUnique().HasDatabaseName("rooms_name_unique");
    }
}
