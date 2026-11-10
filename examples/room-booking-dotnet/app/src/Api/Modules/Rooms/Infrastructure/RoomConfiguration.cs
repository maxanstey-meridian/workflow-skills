using Cowork.Api.Modules.Rooms.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cowork.Api.Modules.Rooms.Infrastructure;

public sealed class RoomConfiguration : IEntityTypeConfiguration<Room>
{
    public void Configure(EntityTypeBuilder<Room> builder)
    {
        builder.ToTable("rooms");
        builder.HasKey(room => room.Id);
        builder.Property(room => room.Id).ValueGeneratedNever();
        builder.Property(room => room.Name).HasMaxLength(100).IsRequired();
        builder.Property(room => room.Capacity).IsRequired();
    }
}
