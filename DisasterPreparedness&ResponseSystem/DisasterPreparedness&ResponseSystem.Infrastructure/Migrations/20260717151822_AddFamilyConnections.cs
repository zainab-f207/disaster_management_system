using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DisasterPreparedness_ResponseSystem.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddFamilyConnections : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "FamilyConnections",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OwnerUserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    MemberUserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FamilyConnections", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FamilyConnections_AspNetUsers_MemberUserId",
                        column: x => x.MemberUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_FamilyConnections_AspNetUsers_OwnerUserId",
                        column: x => x.OwnerUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_FamilyConnections_MemberUserId",
                table: "FamilyConnections",
                column: "MemberUserId");

            migrationBuilder.CreateIndex(
                name: "IX_FamilyConnections_OwnerUserId",
                table: "FamilyConnections",
                column: "OwnerUserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "FamilyConnections");
        }
    }
}
