using Microsoft.EntityFrameworkCore;
using DisasterPreparedness_ResponseSystem.Core.Entity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
namespace DisasterPreparedness_ResponseSystem.Infrastructure.Data
{
    public class AppDbContext : IdentityDbContext<ApplicationUser>
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<Disaster> Disasters => Set<Disaster>();
        public DbSet<DisasterReport> DisasterReports => Set<DisasterReport>();
        public DbSet<ResponderAssignment> ResponderAssignments => Set<ResponderAssignment>();   
        public DbSet<Alert> Alerts => Set<Alert>();
        public DbSet<ResponderOrganization> ResponderOrganizations => Set<ResponderOrganization>();
        public DbSet<PushSubscription> PushSubscriptions => Set<PushSubscription>();
        public DbSet<SafetyCheck> SafetyChecks => Set<SafetyCheck>();
        public DbSet<ResponderLocationPing> ResponderLocationPings => Set<ResponderLocationPing>();
        public DbSet<ReportVerification> ReportVerifications => Set<ReportVerification>();
        public DbSet<ChatMessage> ChatMessages => Set<ChatMessage>();
        public DbSet<FamilyConnection> FamilyConnections => Set<FamilyConnection>();

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);
            builder.Entity<Disaster>()
            .HasOne(d => d.VerifiedByUser)
            .WithMany()
            .OnDelete(DeleteBehavior.SetNull);

            builder.Entity<ResponderAssignment>()
                .HasOne(a => a.AssignedUser)
                .WithMany()
                .OnDelete(DeleteBehavior.SetNull);

            builder.Entity<ResponderAssignment>()
                .HasOne(a => a.Disaster)
                .WithMany(d => d.Assignments)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<ResponderLocationPing>()
                .HasOne(p => p.Assignment)
                .WithMany()
                .HasForeignKey(p => p.AssignmentId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<ResponderLocationPing>()
                .HasIndex(p => new { p.AssignmentId, p.RecordedAt });

            builder.Entity<FamilyConnection>()
    .HasOne(f => f.OwnerUser).WithMany().HasForeignKey(f => f.OwnerUserId).OnDelete(DeleteBehavior.Restrict);
            builder.Entity<FamilyConnection>()
                .HasOne(f => f.MemberUser).WithMany().HasForeignKey(f => f.MemberUserId).OnDelete(DeleteBehavior.Restrict);



            builder.Entity<Disaster>()
                .HasIndex(d => new { d.Status, d.Type });

            builder.Entity<Disaster>()
                .HasIndex(d => new { d.Latitude, d.Longitude });

            builder.Entity<Disaster>().Property(d => d.Type).HasConversion<string>();
            builder.Entity<Disaster>().Property(d => d.Severity).HasConversion<string>();
            builder.Entity<Disaster>().Property(d => d.Status).HasConversion<string>();
            builder.Entity<Disaster>().Property(d => d.Source).HasConversion<string>();
            builder.Entity<ResponderOrganization>().Property(o => o.Type).HasConversion<string>();
            builder.Entity<ResponderAssignment>().Property(a => a.Status).HasConversion<string>();
            builder.Entity<Alert>().Property(a => a.Severity).HasConversion<string>();
            builder.Entity<Alert>().Property(a => a.Audience).HasConversion<string>();
            builder.Entity<DisasterReport>().Property(r => r.Status).HasConversion<string>();
            builder.Entity<DisasterReport>().Property(r => r.Type).HasConversion<string>();


        }
}
}
