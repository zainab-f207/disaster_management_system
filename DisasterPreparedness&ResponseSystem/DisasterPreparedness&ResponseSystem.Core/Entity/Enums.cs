namespace DisasterPreparedness_ResponseSystem.Core.Entity
{
    public class Enums
    {
        public enum DisasterType {
            Flood,
            Earthquake,
            Storm,
            Landslide,
            Lightning,
            Heatwave,
            Smog,
            DustStorm,
            ColdWave,
            RoadAccident,
            UrbanFire,
            BuildingCollapse,
            GasExplosion,
            IndustrialAccident,
            TrainAccident,
            Stampede,
            WaterContamination,
            PowerGridFailure,
            Other
        }

        public enum DisasterCategory
        {
            NaturalFullResponse,   
            NaturalAlertOnly,      
            ManMadeFullResponse,   
            InfrastructureAlert
        }
        public enum SeverityLevel { Low, Medium, High, Critical }
        public enum DisasterStatus {
            Pending,              
            UnderVerification,    
            Verified,             

            ResponseInProgress,
            Resolved,
            FalseAlarm,
            Closed,

            AlertActive,         
            AlertExpired
        }
        public enum DisasterSource {
            WeatherApi,
            EarthquakeApi,
            AirQualityApi,
            CitizenReport,       
            AdminReport,         
            ResponderReport,      
            OfficialAgency
        }
        public enum OrganizationType {
            Rescue1122,
            NDMA,
            PDMA,
            EdhiFoundation,
            AlkhidmatFoundation,
            ChhipaWelfare,
            PakistanRedCrescentSociety,
            CivilDefence,
            Police,
            FireBrigade,               
            HealthDepartment,          
            PMD,                       
            EnvironmentDepartment,     
            WASA,                      
            ElectricityDistribution,   
            GasCompany,                
            PakistanRailways,          
            WaterAuthority,            
            Other
        }
        public enum AssignmentStatus { Assigned, EnRoute, OnSite, Completed, Cancelled }
        public enum AssignmentMethod { Auto, ManualOverride }
        public enum ReportStatus { Pending, Reviewed, Merged, Rejected }
    }
}
