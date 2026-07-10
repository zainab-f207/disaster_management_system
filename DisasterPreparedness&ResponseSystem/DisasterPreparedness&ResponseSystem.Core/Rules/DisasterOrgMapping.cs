using System;
using System.Collections.Generic;
using static DisasterPreparedness_ResponseSystem.Core.Entity.Enums;

namespace DisasterPreparedness_ResponseSystem.Core.Rules
{
    public static class DisasterOrgMapping
    {
        public static readonly Dictionary<DisasterType, OrganizationType[]> PreferredOrgs = new()
        {
            // ==========================
            // Natural Disasters
            // ==========================

            {
                DisasterType.Flood,
                new[]
                {
                    OrganizationType.Rescue1122,
                    OrganizationType.PDMA,
                    OrganizationType.NDMA,
                    OrganizationType.EdhiFoundation,
                    OrganizationType.AlkhidmatFoundation
                }
            },

            {
                DisasterType.Earthquake,
                new[]
                {
                    OrganizationType.Rescue1122,
                    OrganizationType.PDMA,
                    OrganizationType.NDMA,
                    OrganizationType.CivilDefence,
                    OrganizationType.EdhiFoundation
                }
            },

            {
                DisasterType.Heatwave,
                new[]
                {
                    OrganizationType.HealthDepartment,
                    OrganizationType.PMD,
                    OrganizationType.PDMA
                }
            },

            {
                DisasterType.Storm,
                new[]
                {
                    OrganizationType.PMD,
                    OrganizationType.PDMA,
                    OrganizationType.Rescue1122
                }
            },

            {
                DisasterType.Landslide,
                new[]
                {
                    OrganizationType.Rescue1122,
                    OrganizationType.PDMA,
                    OrganizationType.CivilDefence
                }
            },

            // ==========================
            // Man-Made Emergencies
            // ==========================

            {
                DisasterType.RoadAccident,
                new[]
                {
                    OrganizationType.Rescue1122,
                    OrganizationType.Police,
                    OrganizationType.EdhiFoundation,
                    OrganizationType.ChhipaWelfare
                }
            },

            {
                DisasterType.BuildingCollapse,
                new[]
                {
                    OrganizationType.Rescue1122,
                    OrganizationType.CivilDefence,
                    OrganizationType.EdhiFoundation
                }
            },

            {
                DisasterType.IndustrialAccident,
                new[]
                {
                    OrganizationType.Rescue1122,
                    OrganizationType.CivilDefence,
                    OrganizationType.HealthDepartment
                }
            },

            {
                DisasterType.UrbanFire,
                new[]
                {
                    OrganizationType.FireBrigade,
                    OrganizationType.Rescue1122,
                    OrganizationType.CivilDefence
                }
            },

            {
                DisasterType.GasExplosion,
                new[]
                {
                    OrganizationType.Rescue1122,
                    OrganizationType.GasCompany,
                    OrganizationType.CivilDefence
                }
            },

            {
                DisasterType.TrainAccident,
                new[]
                {
                    OrganizationType.Rescue1122,
                    OrganizationType.PakistanRailways,
                    OrganizationType.EdhiFoundation
                }
            },

            {
                DisasterType.Stampede,
                new[]
                {
                    OrganizationType.Police,
                    OrganizationType.Rescue1122,
                    OrganizationType.EdhiFoundation
                }
            },

            // ==========================
            // Infrastructure / Public Health
            // ==========================

            {
                DisasterType.WaterContamination,
                new[]
                {
                    OrganizationType.WASA,
                    OrganizationType.HealthDepartment,
                    OrganizationType.PDMA
                }
            },

            {
                DisasterType.PowerGridFailure,
                new[]
                {
                    OrganizationType.ElectricityDistribution,
                    OrganizationType.PDMA
                }
            },

            // ==========================
            // Other
            // ==========================

            {
                DisasterType.Other,
                new[]
                {
                    OrganizationType.Rescue1122
                }
            }
        };
    }
}