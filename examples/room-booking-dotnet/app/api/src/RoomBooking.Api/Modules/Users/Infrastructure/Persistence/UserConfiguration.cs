using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RoomBooking.Api.Modules.Users.Domain;

namespace RoomBooking.Api.Modules.Users.Infrastructure.Persistence;

public sealed class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("users");
        builder.HasKey(user => user.Id);
        builder.Property(user => user.Id).HasColumnName("id").ValueGeneratedNever();
        builder.Property(user => user.Name).HasColumnName("name").HasMaxLength(200).IsRequired();
        builder.Property(user => user.Email).HasColumnName("email").HasMaxLength(320).IsRequired();
        builder.Property(user => user.Role).HasColumnName("role").HasConversion<int>();
        builder.HasIndex(user => user.Email).IsUnique().HasDatabaseName("users_email_unique");
    }
}
