using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RoomBooking.Api.Host.Persistence.Migrations;

/// <inheritdoc />
public partial class InitialUsersAndRooms : Migration
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
                    type: "character varying(100)",
                    maxLength: 100,
                    nullable: false
                ),
                capacity = table.Column<int>(type: "integer", nullable: false),
                created_at = table.Column<DateTimeOffset>(
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
                role = table.Column<int>(type: "integer", nullable: false),
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_users", x => x.id);
            }
        );

        migrationBuilder.CreateIndex(
            name: "rooms_name_unique",
            table: "rooms",
            column: "name",
            unique: true
        );

        migrationBuilder.CreateIndex(
            name: "users_email_unique",
            table: "users",
            column: "email",
            unique: true
        );
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "rooms");

        migrationBuilder.DropTable(name: "users");
    }
}
