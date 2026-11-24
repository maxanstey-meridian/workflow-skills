using Cowork.Api.Modules.Rooms.Application;
using Cowork.Api.Modules.Rooms.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cowork.Api.Modules.Rooms.Infrastructure;

public sealed class RoomConfiguration : IEntityTypeConfiguration<Room>
{
    public void Configure(EntityTypeBuilder<Room> builder)
    {
        builder.ToTable("rooms");
        builder.HasKey(r => r.Id);
        builder.Property(r => r.Id).ValueGeneratedNever();
        builder.Property(r => r.Name).HasMaxLength(AddRoomLimits.NameMaxLength).IsRequired();
        builder.Property(r => r.Capacity).IsRequired();
    }
}
