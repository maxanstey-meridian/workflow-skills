using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Cowork.Api.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class Initial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // btree_gist gives the exclusion index its equality part (room_id).
            migrationBuilder.Sql("CREATE EXTENSION IF NOT EXISTS btree_gist");

            migrationBuilder.CreateTable(
                name: "bookings",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    room_id = table.Column<Guid>(type: "uuid", nullable: false),
                    member_email = table.Column<string>(
                        type: "character varying(200)",
                        maxLength: 200,
                        nullable: false
                    ),
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
                    created_at = table.Column<DateTimeOffset>(
                        type: "timestamp with time zone",
                        nullable: false
                    ),
                    reminder_sent_at = table.Column<DateTimeOffset>(
                        type: "timestamp with time zone",
                        nullable: true
                    ),
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_bookings", x => x.id);
                }
            );

            migrationBuilder.CreateTable(
                name: "rooms",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(
                        type: "character varying(80)",
                        maxLength: 80,
                        nullable: false
                    ),
                    capacity = table.Column<int>(type: "integer", nullable: false),
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_rooms", x => x.id);
                }
            );

            migrationBuilder.CreateIndex(
                name: "ix_bookings_member_email",
                table: "bookings",
                column: "member_email"
            );

            migrationBuilder.CreateIndex(
                name: "ix_bookings_status_starts_at",
                table: "bookings",
                columns: new[] { "status", "starts_at" }
            );

            migrationBuilder.Sql(
                """
                ALTER TABLE bookings ADD CONSTRAINT ck_bookings_status
                CHECK (status IN ('Booked', 'CheckedIn', 'Cancelled', 'Released'));

                -- The authoritative boundary for "a room holds at most one active booking
                -- at any instant": two concurrent inserts for overlapping slots cannot
                -- both commit, because GiST arbitration happens inside the writes.
                ALTER TABLE bookings ADD CONSTRAINT bookings_no_overlapping_active_bookings
                EXCLUDE USING gist (room_id WITH =, tstzrange(starts_at, ends_at) WITH &&)
                WHERE (status IN ('Booked', 'CheckedIn'));
                """
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                "ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_no_overlapping_active_bookings"
            );
            migrationBuilder.Sql(
                "ALTER TABLE bookings DROP CONSTRAINT IF EXISTS ck_bookings_status"
            );

            migrationBuilder.DropTable(name: "bookings");

            migrationBuilder.DropTable(name: "rooms");
        }
    }
}
