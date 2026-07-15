using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DisasterPreparedness_ResponseSystem.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddResponderTracking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SourceReference",
                table: "Disasters",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "ResponderLocationPings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AssignmentId = table.Column<int>(type: "int", nullable: false),
                    Latitude = table.Column<double>(type: "float", nullable: false),
                    Longitude = table.Column<double>(type: "float", nullable: false),
                    SpeedKmh = table.Column<double>(type: "float", nullable: true),
                    AccuracyMeters = table.Column<double>(type: "float", nullable: true),
                    RecordedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ResponderLocationPings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ResponderLocationPings_ResponderAssignments_AssignmentId",
                        column: x => x.AssignmentId,
                        principalTable: "ResponderAssignments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ResponderLocationPings_AssignmentId_RecordedAt",
                table: "ResponderLocationPings",
                columns: new[] { "AssignmentId", "RecordedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ResponderLocationPings");

            migrationBuilder.DropColumn(
                name: "SourceReference",
                table: "Disasters");
        }
    }
}
