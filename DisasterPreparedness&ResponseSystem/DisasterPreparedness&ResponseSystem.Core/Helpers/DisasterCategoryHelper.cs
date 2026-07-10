using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static DisasterPreparedness_ResponseSystem.Core.Entity.Enums;

namespace DisasterPreparedness_ResponseSystem.Core.Helpers
{

    public static class DisasterCategoryHelper
    {
        // ── Alert-Only types (no physical responder dispatched) ───────────────
        private static readonly HashSet<DisasterType> AlertOnlyTypes = new()
    {
        DisasterType.Heatwave,
        DisasterType.Smog,
        DisasterType.DustStorm,
        DisasterType.ColdWave,
        DisasterType.WaterContamination,
        DisasterType.PowerGridFailure,
    };

        // ── Types that can be auto-detected from external APIs ────────────────
        // Only natural weather/seismic events qualify
        // Man-made disasters CANNOT be auto-detected — they require citizen reports
        private static readonly HashSet<DisasterType> AutoDetectableTypes = new()
    {
        DisasterType.Flood,
        DisasterType.Earthquake,
        DisasterType.Storm,
        DisasterType.Heatwave,      
        DisasterType.DustStorm,     
        DisasterType.Smog,          
        DisasterType.ColdWave,     
        DisasterType.Lightning,
        DisasterType.Landslide,     
    };

        /// <summary>
        /// Alert-only disasters warn citizens with precautions
        /// but do NOT dispatch a physical responder organization.
        /// </summary>
        public static bool IsAlertOnly(DisasterType type)
            => AlertOnlyTypes.Contains(type);

        /// <summary>
        /// Returns true if this disaster type can be created automatically
        /// from external APIs (Open-Meteo, USGS).
        /// Man-made disasters like RoadAccident, BuildingCollapse etc.
        /// can ONLY come from citizen/responder reports — never auto-created.
        /// </summary>
        public static bool CanBeAutoDetected(DisasterType type)
            => AutoDetectableTypes.Contains(type);

        /// <summary>
        /// Requires a physical responder organization to be dispatched.
        /// Alert-only types do not require dispatch.
        /// </summary>
        public static bool RequiresResponderDispatch(DisasterType type)
            => !AlertOnlyTypes.Contains(type);

        /// <summary>
        /// Citizen-facing precaution message for alert-only disasters.
        /// Sent in push notification + SignalR alert instead of "responder assigned".
        /// </summary>
        public static string GetPrecautionMessage(DisasterType type) => type switch
        {
            DisasterType.Heatwave =>
                "Stay indoors between 10AM–4PM. Drink water every 30 minutes. " +
                "Avoid direct sun. Check on elderly neighbors. " +
                "Call 1122 if someone collapses from heat.",

            DisasterType.Smog =>
                "Air quality is hazardous. Wear N95 mask outdoors. " +
                "Keep windows closed. Avoid outdoor exercise. " +
                "Children and elderly must stay indoors. Environment Dept: 0800-02345",

            DisasterType.DustStorm =>
                "Severe dust storm approaching. Stay indoors immediately. " +
                "Close all windows and doors tightly. " +
                "Cover mouth and nose if caught outside. Avoid all driving.",

            DisasterType.ColdWave =>
                "Extreme cold temperatures expected. Keep warm clothing ready. " +
                "Protect water pipes from freezing. Check on elderly and homeless. " +
                "Edhi emergency shelters available: 115",

            DisasterType.WaterContamination =>
                "Do NOT use tap water for drinking or cooking. " +
                "Use bottled or boiled water only. " +
                "Report contamination to WASA: 042-99230351 | Health Dept: 0800-99000",

            DisasterType.PowerGridFailure =>
                "Major electricity outage in your area. " +
                "Avoid unattended candles. Unplug sensitive electronics. " +
                "LESCO: 118 | KESC: 118 | NDMA helpline: 1135",

            _ => "Emergency alert issued. Follow instructions from local authorities. " +
                 "Stay tuned to Pakistan Meteorological Department updates."
        };

        /// <summary>
        /// Human-readable category label for UI display
        /// </summary>
        public static string GetCategoryLabel(DisasterType type)
        {
            if (AlertOnlyTypes.Contains(type)) return "⚠️ Alert Only";
            if (AutoDetectableTypes.Contains(type)) return "🌍 Natural";
            return "🏭 Man-Made";
        }
    }
}