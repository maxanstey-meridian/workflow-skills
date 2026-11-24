using Cowork.Api.Modules.Bookings.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cowork.Api.Modules.Bookings.Infrastructure;

public sealed class BookingConfiguration : IEntityTypeConfiguration<Booking>
{
    public void Configure(EntityTypeBuilder<Booking> builder)
    {
        builder.ToTable("bookings");
        builder.HasKey(b => b.Id);
        builder.Property(b => b.Id).ValueGeneratedNever();
        builder.Property(b => b.MemberEmail).HasMaxLength(200).IsRequired();
        builder.Property(b => b.Status).HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(b => b.StartsAt).IsRequired();
        builder.Property(b => b.EndsAt).IsRequired();
        builder.Property(b => b.CreatedAt).IsRequired();
        builder.HasIndex(b => b.MemberEmail);
        builder.HasIndex(b => new { b.Status, b.StartsAt });
    }
}
