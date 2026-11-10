using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Cowork.Api.Migrations
{
    /// <inheritdoc />
    public partial class Initial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // The overlap invariant's boundary: two bookings must never hold the same room
            // at overlapping times. btree_gist lets the GiST index compare room_id for
            // equality; the range type needs the half-open '[)' bounds so a booking ending
            // at 10:00 and one starting at 10:00 do not conflict.
            migrationBuilder.Sql("CREATE EXTENSION IF NOT EXISTS btree_gist;");

            migrationBuilder.CreateTable(
                name: "bookings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    room_id = table.Column<Guid>(type: "uuid", nullable: false),
                    member_id = table.Column<Guid>(type: "uuid", nullable: false),
                    starts_at = table.Column<DateTimeOffset>(
                        type: "timestamp with time zone",
                        nullable: false
                    ),
                    ends_at = table.Column<DateTimeOffset>(
                        type: "timestamp with time zone",
                        nullable: false
                    ),
                    status = table.Column<string>(
                        type: "character varying(20)",
                        maxLength: 20,
                        nullable: false
                    ),
                    reminder_sent_at = table.Column<DateTimeOffset>(
                        type: "timestamp with time zone",
                        nullable: true
                    ),
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_bookings", x => x.Id);
                }
            );

            migrationBuilder.CreateTable(
                name: "rooms",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(
                        type: "character varying(100)",
                        maxLength: 100,
                        nullable: false
                    ),
                    Capacity = table.Column<int>(type: "integer", nullable: false),
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_rooms", x => x.Id);
                }
            );

            migrationBuilder.CreateIndex(
                name: "IX_bookings_member_id_starts_at",
                table: "bookings",
                columns: new[] { "member_id", "starts_at" }
            );

            migrationBuilder.CreateIndex(
                name: "IX_bookings_room_id_starts_at",
                table: "bookings",
                columns: new[] { "room_id", "starts_at" }
            );

            migrationBuilder.Sql(
                """
                ALTER TABLE bookings ADD CONSTRAINT bookings_no_double_hold
                EXCLUDE USING gist (room_id WITH =, tstzrange(starts_at, ends_at, '[)') WITH &&)
                WHERE (status IN ('Booked', 'CheckedIn'))
                """
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                "ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_no_double_hold;"
            );

            migrationBuilder.DropTable(name: "bookings");

            migrationBuilder.DropTable(name: "rooms");
        }
    }
}
