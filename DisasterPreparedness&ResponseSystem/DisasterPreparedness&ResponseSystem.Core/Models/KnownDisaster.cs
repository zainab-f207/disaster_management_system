using System;

namespace DisasterPreparedness_ResponseSystem.Core.Models
{
    public class KnownDisaster
    {
        public string City { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public string Type { get; set; } = string.Empty;
    }
}
