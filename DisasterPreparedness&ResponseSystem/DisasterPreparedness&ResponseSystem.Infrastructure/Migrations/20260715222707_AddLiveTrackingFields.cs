using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DisasterPreparedness_ResponseSystem.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddLiveTrackingFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // All columns (CurrentLatitude, CurrentLongitude, LocationUpdatedAt,
            // OperationStarted, OperationStartedAt) were already applied to the
            // database before this migration file was regenerated after an accidental
            // project deletion. This Up() is intentionally a no-op to allow EF Core
            // to record this migration as applied without re-running the SQL.
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "OperationStarted",
                table: "ResponderAssignments");

            migrationBuilder.DropColumn(
                name: "OperationStartedAt",
                table: "ResponderAssignments");

            migrationBuilder.DropColumn(
                name: "CurrentLatitude",
                table: "ResponderAssignments");

            migrationBuilder.DropColumn(
                name: "CurrentLongitude",
                table: "ResponderAssignments");

            migrationBuilder.DropColumn(
                name: "LocationUpdatedAt",
                table: "ResponderAssignments");
        }
    }
}
