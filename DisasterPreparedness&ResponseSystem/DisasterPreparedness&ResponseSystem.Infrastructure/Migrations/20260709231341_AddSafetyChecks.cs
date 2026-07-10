using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DisasterPreparedness_ResponseSystem.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddSafetyChecks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsDuplicate",
                table: "DisasterReports",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "SafetyChecks",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DisasterId = table.Column<int>(type: "int", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    MarkedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SafetyChecks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SafetyChecks_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SafetyChecks_Disasters_DisasterId",
                        column: x => x.DisasterId,
                        principalTable: "Disasters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SafetyChecks_DisasterId",
                table: "SafetyChecks",
                column: "DisasterId");

            migrationBuilder.CreateIndex(
                name: "IX_SafetyChecks_UserId",
                table: "SafetyChecks",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SafetyChecks");

            migrationBuilder.DropColumn(
                name: "IsDuplicate",
                table: "DisasterReports");
        }
    }
}
