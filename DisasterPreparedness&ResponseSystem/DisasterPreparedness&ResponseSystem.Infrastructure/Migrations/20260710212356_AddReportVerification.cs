using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DisasterPreparedness_ResponseSystem.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddReportVerification : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ReportVerifications",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ReportId = table.Column<int>(type: "int", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Confirmed = table.Column<bool>(type: "bit", nullable: false),
                    VotedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReportVerifications", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ReportVerifications_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ReportVerifications_DisasterReports_ReportId",
                        column: x => x.ReportId,
                        principalTable: "DisasterReports",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ReportVerifications_ReportId",
                table: "ReportVerifications",
                column: "ReportId");

            migrationBuilder.CreateIndex(
                name: "IX_ReportVerifications_UserId",
                table: "ReportVerifications",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ReportVerifications");
        }
    }
}
