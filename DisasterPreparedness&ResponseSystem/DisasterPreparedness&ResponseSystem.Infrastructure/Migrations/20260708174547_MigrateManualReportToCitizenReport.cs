using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DisasterPreparedness_ResponseSystem.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class MigrateManualReportToCitizenReport : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Copy rows from ManualReports into CitizenReports (preserve data except identity/Id)
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'dbo.ManualReports', N'U') IS NOT NULL AND OBJECT_ID(N'dbo.CitizenReports', N'U') IS NOT NULL
BEGIN
    INSERT INTO CitizenReports (DisasterId, Type, ReportedByUserId, Description, Latitude, Longitude, LocationName, ImageUrl, Status, CreatedAt)
    SELECT DisasterId, Type, ReportedByUserId, Description, Latitude, Longitude, LocationName, ImageUrl, Status, CreatedAt
    FROM ManualReports;

    -- Update any existing Disaster records that reference ManualReport in Source
    IF OBJECT_ID(N'dbo.Disasters', N'U') IS NOT NULL
    BEGIN
        UPDATE Disasters
        SET Source = 'CitizenReport'
        WHERE Source = 'ManualReport';
    END

    DROP TABLE ManualReports;
END
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Recreate ManualReports and move data back from CitizenReports
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'dbo.ManualReports', N'U') IS NULL
BEGIN
    CREATE TABLE ManualReports (
        Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        DisasterId INT NULL,
        Type NVARCHAR(100) NULL,
        ReportedByUserId NVARCHAR(450) NULL,
        Description NVARCHAR(MAX) NULL,
        Latitude FLOAT NOT NULL,
        Longitude FLOAT NOT NULL,
        LocationName NVARCHAR(250) NULL,
        ImageUrl NVARCHAR(2000) NULL,
        Status NVARCHAR(100) NULL,
        CreatedAt DATETIME2 NOT NULL
    );
END

IF OBJECT_ID(N'dbo.CitizenReports', N'U') IS NOT NULL
BEGIN
    INSERT INTO ManualReports (DisasterId, Type, ReportedByUserId, Description, Latitude, Longitude, LocationName, ImageUrl, Status, CreatedAt)
    SELECT DisasterId, Type, ReportedByUserId, Description, Latitude, Longitude, LocationName, ImageUrl, Status, CreatedAt
    FROM CitizenReports;
END
");
        }
    }
}
