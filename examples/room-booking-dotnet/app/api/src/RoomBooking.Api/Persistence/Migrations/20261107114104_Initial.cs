using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RoomBooking.Api.Persistence.Migrations;

/// <inheritdoc />
public partial class Initial : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "rooms",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                name = table.Column<string>(
                    type: "character varying(200)",
                    maxLength: 200,
                    nullable: false
                ),
                capacity = table.Column<int>(type: "integer", nullable: false),
                created_at = table.Column<DateTime>(
                    type: "timestamp with time zone",
                    nullable: false
                ),
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_rooms", x => x.id);
            }
        );

        migrationBuilder.CreateTable(
            name: "users",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                name = table.Column<string>(
                    type: "character varying(200)",
                    maxLength: 200,
                    nullable: false
                ),
                email = table.Column<string>(
                    type: "character varying(320)",
                    maxLength: 320,
                    nullable: false
                ),
                role = table.Column<string>(type: "text", nullable: false),
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_users", x => x.id);
            }
        );

        migrationBuilder.CreateTable(
            name: "bookings",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                room_id = table.Column<Guid>(type: "uuid", nullable: false),
                member_id = table.Column<Guid>(type: "uuid", nullable: false),
                member_email = table.Column<string>(
                    type: "character varying(320)",
                    maxLength: 320,
                    nullable: false
                ),
                start_utc = table.Column<DateTime>(
                    type: "timestamp with time zone",
                    nullable: false
                ),
                end_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                created_at = table.Column<DateTime>(
                    type: "timestamp with time zone",
                    nullable: false
                ),
                status = table.Column<string>(type: "text", nullable: false),
                reminder_sent_at = table.Column<DateTime>(
                    type: "timestamp with time zone",
                    nullable: true
                ),
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_bookings", x => x.id);
                table.ForeignKey(
                    name: "FK_bookings_rooms_room_id",
                    column: x => x.room_id,
                    principalTable: "rooms",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict
                );
            }
        );

        migrationBuilder.CreateIndex(
            name: "IX_bookings_room_id",
            table: "bookings",
            column: "room_id"
        );

        migrationBuilder.CreateIndex(
            name: "IX_rooms_name",
            table: "rooms",
            column: "name",
            unique: true
        );

        migrationBuilder.CreateIndex(
            name: "IX_users_email",
            table: "users",
            column: "email",
            unique: true
        );

        // The booking invariant, enforced by the database: two bookings must
        // never hold the same room at overlapping times. Only bookings that
        // still hold their room (Booked, CheckedIn) take part; cancels and
        // releases free the slot for rebooking. Tstzrange('[)') matches the
        // half-open slot semantics the application uses; btree_gist supplies
        // the uuid-equality operator class gist needs.
        migrationBuilder.Sql("CREATE EXTENSION IF NOT EXISTS btree_gist;");

        migrationBuilder.Sql(
            """
            ALTER TABLE bookings
            ADD CONSTRAINT bookings_no_room_overlap
            EXCLUDE USING gist (
                room_id WITH =,
                tstzrange(start_utc, end_utc, '[)') WITH &&
            )
            WHERE (status IN ('Booked', 'CheckedIn'));
            """
        );
    }

    /// <inheritdoc />
    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "bookings");

        migrationBuilder.DropTable(name: "users");

        migrationBuilder.DropTable(name: "rooms");
    }
}
