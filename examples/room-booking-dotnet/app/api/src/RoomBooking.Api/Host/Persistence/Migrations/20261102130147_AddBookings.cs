using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RoomBooking.Api.Host.Persistence.Migrations;

/// <inheritdoc />
public partial class AddBookings : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "bookings",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
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
                status = table.Column<int>(type: "integer", nullable: false),
                check_in_at = table.Column<DateTimeOffset>(
                    type: "timestamp with time zone",
                    nullable: true
                ),
                reminder_sent_at = table.Column<DateTimeOffset>(
                    type: "timestamp with time zone",
                    nullable: true
                ),
                held_until = table.Column<DateTimeOffset>(
                    type: "timestamp with time zone",
                    nullable: false
                ),
                created_at = table.Column<DateTimeOffset>(
                    type: "timestamp with time zone",
                    nullable: false
                ),
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_bookings", x => x.id);
            }
        );

        migrationBuilder.CreateIndex(
            name: "bookings_member_id",
            table: "bookings",
            column: "member_id"
        );

        migrationBuilder.CreateIndex(
            name: "bookings_starts_at",
            table: "bookings",
            column: "starts_at"
        );

        // The overlap invariant's authoritative boundary: for every room, the half-open holds
        // [starts_at, held_until) of active bookings (status IN (1, 2) = Booked, CheckedIn)
        // must never overlap. btree_gist is required for the equality term on room_id.
        migrationBuilder.Sql("CREATE EXTENSION IF NOT EXISTS btree_gist;");

        migrationBuilder.Sql(
            "ALTER TABLE bookings ADD CONSTRAINT bookings_room_no_overlap "
                + "EXCLUDE USING gist (room_id WITH =, (tstzrange(starts_at, held_until, '[)')) WITH &&) "
                + "WHERE (status IN (1, 2));"
        );

        // Cross-module references, raw SQL: the host DbContext declares no navigations between
        // module entities (module isolation), so EF cannot emit these.
        migrationBuilder.Sql(
            "ALTER TABLE bookings ADD CONSTRAINT bookings_room_id_fkey "
                + "FOREIGN KEY (room_id) REFERENCES rooms (id);"
        );
        migrationBuilder.Sql(
            "ALTER TABLE bookings ADD CONSTRAINT bookings_member_id_fkey "
                + "FOREIGN KEY (member_id) REFERENCES users (id);"
        );
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(
            "ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_member_id_fkey;"
        );
        migrationBuilder.Sql(
            "ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_room_id_fkey;"
        );
        migrationBuilder.Sql(
            "ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_room_no_overlap;"
        );

        migrationBuilder.DropTable(name: "bookings");

        // btree_gist stays: it is a cluster-shared extension and other objects may use it.
    }
}
