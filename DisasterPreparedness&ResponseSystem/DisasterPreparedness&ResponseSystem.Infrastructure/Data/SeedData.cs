using DisasterPreparedness_ResponseSystem.Core.Entity;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static DisasterPreparedness_ResponseSystem.Core.Entity.Enums;

namespace DisasterPreparedness_ResponseSystem.Infrastructure.Data
{
    public static class SeedData
    {
        public static List<ResponderOrganization> GetSeedOrganizations() => new()
{
    // ── Rescue 1122 (Standard Nationwide Emergency) ────────────────────
    new() { Name="Rescue 1122 Lahore",     Type=OrganizationType.Rescue1122, ContactNumber="1122", BaseLatitude=31.5204, BaseLongitude=74.3587 },
    new() { Name="Rescue 1122 Karachi",    Type=OrganizationType.Rescue1122, ContactNumber="1122", BaseLatitude=24.8607, BaseLongitude=67.0011 },
    new() { Name="Rescue 1122 Islamabad",  Type=OrganizationType.Rescue1122, ContactNumber="1122", BaseLatitude=33.6844, BaseLongitude=73.0479 },
    new() { Name="Rescue 1122 Multan",     Type=OrganizationType.Rescue1122, ContactNumber="1122", BaseLatitude=30.1575, BaseLongitude=71.5249 },
    new() { Name="Rescue 1122 Peshawar",   Type=OrganizationType.Rescue1122, ContactNumber="1122", BaseLatitude=34.0151, BaseLongitude=71.5249 },
    new() { Name="Rescue 1122 Faisalabad", Type=OrganizationType.Rescue1122, ContactNumber="1122", BaseLatitude=31.4504, BaseLongitude=73.1350 },
    new() { Name="Rescue 1122 Rawalpindi", Type=OrganizationType.Rescue1122, ContactNumber="1122", BaseLatitude=33.5651, BaseLongitude=73.0169 },

    // ── PDMA (Provincial Disaster Management Authorities) ───────────────
    new() { Name="PDMA Punjab",       Type=OrganizationType.PDMA, ContactNumber="1129",           BaseLatitude=31.5204, BaseLongitude=74.3587 },
    new() { Name="PDMA Sindh",        Type=OrganizationType.PDMA, ContactNumber="021-99243371",    BaseLatitude=24.8607, BaseLongitude=67.0011 },
    new() { Name="PDMA KPK",          Type=OrganizationType.PDMA, ContactNumber="091-9213862",     BaseLatitude=34.0151, BaseLongitude=71.5249 },
    new() { Name="PDMA Balochistan",  Type=OrganizationType.PDMA, ContactNumber="081-9241133",     BaseLatitude=30.1798, BaseLongitude=66.9750 },

    // ── NDMA ────────────────────────────────────────────────────────────
    new() { Name="NDMA Headquarters", Type=OrganizationType.NDMA, ContactNumber="051-111-157-157", BaseLatitude=33.6844, BaseLongitude=73.0479 },

    // ── Welfare & Private Ambulances ────────────────────────────────────
    new() { Name="Edhi Foundation Karachi", Type=OrganizationType.EdhiFoundation, ContactNumber="115", BaseLatitude=24.8607, BaseLongitude=67.0011 },
    new() { Name="Edhi Foundation Lahore",  Type=OrganizationType.EdhiFoundation, ContactNumber="115", BaseLatitude=31.5204, BaseLongitude=74.3587 },
    new() { Name="Edhi Foundation Multan",  Type=OrganizationType.EdhiFoundation, ContactNumber="115", BaseLatitude=30.1575, BaseLongitude=71.5249 },
    new() { Name="Chhipa Welfare Association Karachi", Type=OrganizationType.ChhipaWelfare, ContactNumber="1020", BaseLatitude=24.8607, BaseLongitude=67.0011 },
    new() { Name="Alkhidmat Foundation Lahore",  Type=OrganizationType.AlkhidmatFoundation, ContactNumber="1023", BaseLatitude=31.5204, BaseLongitude=74.3587 },
    new() { Name="Alkhidmat Foundation Karachi", Type=OrganizationType.AlkhidmatFoundation, ContactNumber="1023", BaseLatitude=24.8607, BaseLongitude=67.0011 },

    // ── Pakistan Red Crescent Society ───────────────────────────────────
    new() { Name="Pakistan Red Crescent Headquarters", Type=OrganizationType.PakistanRedCrescentSociety, ContactNumber="051-9250404", BaseLatitude=33.6844, BaseLongitude=73.0479 },
    new() { Name="Pakistan Red Crescent Karachi",      Type=OrganizationType.PakistanRedCrescentSociety, ContactNumber="021-35836743", BaseLatitude=24.8607, BaseLongitude=67.0011 },

    // ── Civil Defence ────────────────────────────────────────────────────
    new() { Name="Civil Defence Lahore",  Type=OrganizationType.CivilDefence, ContactNumber="042-99230351", BaseLatitude=31.5204, BaseLongitude=74.3587 },
    new() { Name="Civil Defence Karachi", Type=OrganizationType.CivilDefence, ContactNumber="021-99215007", BaseLatitude=24.8607, BaseLongitude=67.0011 },

    // ── Police (Standard Nationwide Emergency) ─────────────────────────
    new() { Name="Punjab Police Lahore",   Type=OrganizationType.Police, ContactNumber="15", BaseLatitude=31.5204, BaseLongitude=74.3587 },
    new() { Name="Sindh Police Karachi",   Type=OrganizationType.Police, ContactNumber="15", BaseLatitude=24.8607, BaseLongitude=67.0011 },
    new() { Name="KPK Police Peshawar",    Type=OrganizationType.Police, ContactNumber="15", BaseLatitude=34.0151, BaseLongitude=71.5249 },
    new() { Name="Islamabad Police",       Type=OrganizationType.Police, ContactNumber="15", BaseLatitude=33.6844, BaseLongitude=73.0479 },

    // ── Municipal Fire Brigade ──────────────────────────────────────────
    new() { Name="Lahore Fire Brigade",  Type=OrganizationType.FireBrigade, ContactNumber="16", BaseLatitude=31.5204, BaseLongitude=74.3587 },
    new() { Name="Karachi Fire Brigade", Type=OrganizationType.FireBrigade, ContactNumber="16", BaseLatitude=24.8607, BaseLongitude=67.0011 },

    // ── Health Departments ──────────────────────────────────────────────
    new() { Name="Punjab Health Department",  Type=OrganizationType.HealthDepartment, ContactNumber="042-99205814", BaseLatitude=31.5204, BaseLongitude=74.3587 },
    new() { Name="Sindh Health Department",   Type=OrganizationType.HealthDepartment, ContactNumber="021-99222831", BaseLatitude=24.8607, BaseLongitude=67.0011 },

    // ── Meteorological & Environmental ──────────────────────────────────
    new() { Name="Pakistan Meteorological Department", Type=OrganizationType.PMD, ContactNumber="051-9250360", BaseLatitude=33.6844, BaseLongitude=73.0479 },
    new() { Name="Punjab Environment Protection Dept", Type=OrganizationType.EnvironmentDepartment, ContactNumber="042-99232251", BaseLatitude=31.5204, BaseLongitude=74.3587 },

    // ── Water and Sanitation Authorities ────────────────────────────────
    new() { Name="WASA Lahore",   Type=OrganizationType.WASA, ContactNumber="1334",           BaseLatitude=31.5204, BaseLongitude=74.3587 },
    new() { Name="KWSC Karachi",  Type=OrganizationType.WASA, ContactNumber="1339",           BaseLatitude=24.8607, BaseLongitude=67.0011 },

    // ── Electricity Distribution Companies (Verified Official Regional Helplines) ──
    new() { Name="LESCO (Lahore Electric Supply)",   Type=OrganizationType.ElectricityDistribution, ContactNumber="042-99205214", BaseLatitude=31.5204, BaseLongitude=74.3587 },
    new() { Name="K-Electric (Karachi)",             Type=OrganizationType.ElectricityDistribution, ContactNumber="021-99000",    BaseLatitude=24.8607, BaseLongitude=67.0011 },
    new() { Name="IESCO (Islamabad Electric)",       Type=OrganizationType.ElectricityDistribution, ContactNumber="051-9252937", BaseLatitude=33.6844, BaseLongitude=73.0479 },
    new() { Name="PESCO (Peshawar Electric)",        Type=OrganizationType.ElectricityDistribution, ContactNumber="091-9212013", BaseLatitude=34.0151, BaseLongitude=71.5249 },
    new() { Name="GEPCO (Gujranwala Electric)",      Type=OrganizationType.ElectricityDistribution, ContactNumber="055-9200516", BaseLatitude=32.1877, BaseLongitude=74.1945 },
    new() { Name="FESCO (Faisalabad Electric)",      Type=OrganizationType.ElectricityDistribution, ContactNumber="041-9220184", BaseLatitude=31.4504, BaseLongitude=73.1350 },
    new() { Name="MEPCO (Multan Electric)",          Type=OrganizationType.ElectricityDistribution, ContactNumber="061-9220169", BaseLatitude=30.1575, BaseLongitude=71.5249 },
    new() { Name="HESCO (Hyderabad Electric)",       Type=OrganizationType.ElectricityDistribution, ContactNumber="022-9260161", BaseLatitude=25.3960, BaseLongitude=68.3578 },
    new() { Name="QESCO (Quetta Electric)",          Type=OrganizationType.ElectricityDistribution, ContactNumber="081-9201977", BaseLatitude=30.1798, BaseLongitude=66.9750 },
    new() { Name="TESCO (Tribal Electric)",          Type=OrganizationType.ElectricityDistribution, ContactNumber="091-9212964", BaseLatitude=34.0151, BaseLongitude=71.5249 },

    // ── Gas Companies (Emergency Leaks Hotline) ─────────────────────────
    new() { Name="SNGPL (Sui Northern Gas) Lahore",    Type=OrganizationType.GasCompany, ContactNumber="1199", BaseLatitude=31.5204, BaseLongitude=74.3587 },
    new() { Name="SSGC (Sui Southern Gas) Karachi",    Type=OrganizationType.GasCompany, ContactNumber="1199", BaseLatitude=24.8607, BaseLongitude=67.0011 },

    // ── Pakistan Railways ─────────────────────────────────────────────────
    new() { Name="Pakistan Railways Headquarters", Type=OrganizationType.PakistanRailways, ContactNumber="1171", BaseLatitude=31.5546, BaseLongitude=74.3315 },
};
    }

}