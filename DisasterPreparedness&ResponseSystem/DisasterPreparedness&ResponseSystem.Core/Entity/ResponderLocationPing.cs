namespace DisasterPreparedness_ResponseSystem.Core.Entity
{
    /// <summary>
    /// Records a single GPS position ping from a responder during an active assignment.
    /// Pings are sent every ~15 seconds while tracking is active.
    /// </summary>
    public class ResponderLocationPing
    {
        public int Id { get; set; }
        public int AssignmentId { get; set; }
        public ResponderAssignment Assignment { get; set; } = null!;

        public double Latitude { get; set; }
        public double Longitude { get; set; }

        /// <summary>Speed in km/h, if available from the browser Geolocation API.</summary>
        public double? SpeedKmh { get; set; }

        /// <summary>Accuracy radius in meters reported by the device.</summary>
        public double? AccuracyMeters { get; set; }

        public DateTime RecordedAt { get; set; } = DateTime.UtcNow;
    }
}
