import { useState, useEffect, useCallback } from 'react';
import {
  Shield, Globe, Users, Activity, RefreshCw, ExternalLink, Clock, Wifi,
  CloudSun, AlertCircle, Database, BookOpen, Radio
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

/* ────────────────────────────────────────────────
   Constants
──────────────────────────────────────────────── */
const PK_MIN_LAT = 23.5, PK_MAX_LAT = 37.5;
const PK_MIN_LNG = 60.5, PK_MAX_LNG = 77.5;

const PK_CITIES = [
  { name: 'Karachi', lat: 24.8607, lon: 67.0011 },
  { name: 'Lahore', lat: 31.5204, lon: 74.3587 },
  { name: 'Islamabad', lat: 33.6844, lon: 73.0479 },
  { name: 'Peshawar', lat: 34.0151, lon: 71.5249 },
  { name: 'Quetta', lat: 30.1798, lon: 66.9750 },
  { name: 'Multan', lat: 30.1575, lon: 71.5249 },
];

const GLIDE_EVENT_MAP = {
  FL: { label: 'Flood',     type: 'Flood',      emoji: '🌊' },
  EQ: { label: 'Earthquake',type: 'Earthquake', emoji: '🌍' },
  ST: { label: 'Storm',     type: 'Storm',      emoji: '⛈️' },
  TC: { label: 'Cyclone',   type: 'Storm',      emoji: '🌀' },
  LS: { label: 'Landslide', type: 'Landslide',  emoji: '⛰️' },
  DR: { label: 'Drought',   type: 'Other',      emoji: '☀️' },
  HT: { label: 'Heatwave',  type: 'Heatwave',   emoji: '🌡️' },
  AV: { label: 'Avalanche', type: 'Other',      emoji: '❄️' },
  WF: { label: 'Wildfire',  type: 'UrbanFire',  emoji: '🔥' },
  EP: { label: 'Epidemic',  type: 'Other',      emoji: '🦠' },
};

function weatherCode(wmo) {
  if (wmo === 0)  return { label: 'Clear Sky',           emoji: '☀️',  severity: null };
  if (wmo <= 3)   return { label: 'Partly Cloudy',        emoji: '⛅',  severity: null };
  if (wmo <= 9)   return { label: 'Foggy / Haze',         emoji: '🌫️', severity: 'Medium' };
  if (wmo <= 29)  return { label: 'Rain / Drizzle',       emoji: '🌧️', severity: null };
  if (wmo <= 39)  return { label: 'Snow / Sleet',         emoji: '❄️', severity: 'Medium' };
  if (wmo <= 49)  return { label: 'Blowing Snow',         emoji: '🌨️', severity: 'High' };
  if (wmo <= 69)  return { label: 'Moderate Rain',        emoji: '🌧️', severity: 'Medium' };
  if (wmo <= 79)  return { label: 'Heavy Snow',           emoji: '❄️', severity: 'High' };
  if (wmo <= 86)  return { label: 'Rain / Snow Showers',  emoji: '🌨️', severity: 'Medium' };
  if (wmo <= 94)  return { label: 'Thunderstorm',         emoji: '⛈️', severity: 'High' };
  return           { label: 'Violent Thunderstorm',       emoji: '🌪️', severity: 'Critical' };
}

function tempSeverity(c) {
  if (c >= 45) return 'Critical';
  if (c >= 40) return 'High';
  if (c <= -5) return 'High';
  return null;
}

const SEV_COLOR = {
  Critical: '#e53e3e', High: '#dd6b20', Medium: '#d69e2e', Low: '#38a169',
};

function parseCSV(text) {
  const lines = [];
  let row = [""];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        row[row.length - 1] += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push("");
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      lines.push(row);
      row = [""];
    } else {
      row[row.length - 1] += char;
    }
  }
  if (row.length > 1 || row[0] !== "") {
    lines.push(row);
  }

  if (lines.length < 2) return [];
  const headers = lines[0].map(h => h.trim().toLowerCase());
  return lines.slice(1).map(line => {
    const obj = {};
    headers.forEach((header, index) => {
      let val = line[index] || "";
      obj[header] = val.trim();
    });
    return obj;
  });
}

/* ────────────────────────────────────────────────
   Component
──────────────────────────────────────────────── */
export default function AdminSources() {
  const navigate = useNavigate();

  const [earthquakes, setEarthquakes]   = useState([]);
  const [weather, setWeather]           = useState([]);
  const [glideEvents, setGlideEvents]   = useState([]);
  const [reliefWebItems, setRelief]     = useState([]);
  const [hdxDatasets, setHdx]           = useState([]);
  const [citizenReports, setCitizen]    = useState([]);

  const [loading, setLoading] = useState({
    eq: true, wx: true, glide: true, rw: true, hdx: true, cr: true,
  });
  const [errors, setErrors] = useState({});
  const [lastRefresh, setLastRefresh] = useState(null);

  /* ── Fetch helpers ── */
  const setLoad = (key, val) => setLoading(p => ({ ...p, [key]: val }));
  const setErr  = (key, msg) => setErrors(p => ({ ...p, [key]: msg }));

  const fetchEarthquakes = useCallback(async () => {
    setLoad('eq', true);
    try {
      const res  = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson');
      const json = await res.json();
      const pk = (json.features || []).filter(f => {
        const [lon, lat] = f.geometry.coordinates;
        return lat >= PK_MIN_LAT && lat <= PK_MAX_LAT && lon >= PK_MIN_LNG && lon <= PK_MAX_LNG;
      });
      setEarthquakes(pk.slice(0, 6));
      setErr('eq', null);
    } catch { setErr('eq', 'USGS API unreachable. Check network.'); }
    finally  { setLoad('eq', false); }
  }, []);

  const fetchWeather = useCallback(async () => {
    setLoad('wx', true);
    try {
      const lats = PK_CITIES.map(c => c.lat).join(',');
      const lons = PK_CITIES.map(c => c.lon).join(',');
      const url  = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}` +
                   `&current=temperature_2m,weathercode,windspeed_10m,precipitation&timezone=Asia%2FKarachi`;
      const res  = await fetch(url);
      const json = await res.json();
      const arr  = Array.isArray(json) ? json : [json];
      setWeather(PK_CITIES.map((city, i) => ({
        city: city.name, lat: city.lat, lon: city.lon,
        temp: arr[i]?.current?.temperature_2m,
        wmo:  arr[i]?.current?.weathercode,
        wind: arr[i]?.current?.windspeed_10m,
        precip: arr[i]?.current?.precipitation,
      })));
      setErr('wx', null);
    } catch { setErr('wx', 'Open-Meteo unreachable.'); }
    finally  { setLoad('wx', false); }
  }, []);

  /* HDX GLIDE Events for Pakistan — free CKAN API */
  const fetchGlide = useCallback(async () => {
    setLoad('glide', true);
    try {
      // Fetch via our backend proxy to avoid humdata.org CORS errors
      const res = await api.get('/geocoding/historical-events');
      const csvText = res.data;

      // Parse the CSV content
      const records = parseCSV(csvText);

      // Map properties and sort descending by date
      const mapped = records.map(r => ({
        event: r.event || '',
        killed: parseInt(r.killed) || 0,
        affected: parseInt(r.affected) || 0,
        location: r.location || '',
        year: r.year || '',
        month: parseInt(r.month) || 0,
        day: parseInt(r.day) || 0,
        glidenumber: r.glidenumber || ''
      }));

      mapped.sort((a, b) => {
        const yA = parseInt(a.year) || 0;
        const yB = parseInt(b.year) || 0;
        if (yB !== yA) return yB - yA;
        if (b.month !== a.month) return b.month - a.month;
        return b.day - a.day;
      });

      setGlideEvents(mapped.slice(0, 8));
      setErr('glide', null);
    } catch {
      setErr('glide', 'Failed to load GLIDE events. Datastore inactive.');
      setGlideEvents([]);
    }
    finally { setLoad('glide', false); }
  }, []);

  /* ReliefWeb v2 API — free, GET-based to avoid CORS preflight options blocks */
  const fetchReliefWeb = useCallback(async () => {
    setLoad('rw', true);
    try {
      const url = 'https://api.reliefweb.int/v2/disasters?appname=pakistan-drs' +
                  '&filter[field]=country.iso3&filter[value]=PAK' +
                  '&limit=6&sort[]=date:desc' +
                  '&fields[include][]=name&fields[include][]=date&fields[include][]=status' +
                  '&fields[include][]=url&fields[include][]=glide&fields[include][]=type';
      const res = await fetch(url);
      if (!res.ok) throw new Error('non-200');
      const json = await res.json();
      setRelief((json.data || []).slice(0, 6));
      setErr('rw', null);
    } catch {
      setRelief([]);
      setErr('rw', 'ReliefWeb API returned an error. Will retry on refresh.');
    }
    finally { setLoad('rw', false); }
  }, []);

  /* HDX recent Pakistan dataset activity */
  const fetchHdx = useCallback(async () => {
    setLoad('hdx', true);
    try {
      const url  = `https://data.humdata.org/api/3/action/package_search?q=pakistan+flood+earthquake&sort=metadata_modified+desc&rows=5`;
      const res  = await fetch(url);
      const json = await res.json();
      setHdx((json.result?.results || []).slice(0, 5));
      setErr('hdx', null);
    } catch { setErr('hdx', 'HDX API unreachable.'); }
    finally  { setLoad('hdx', false); }
  }, []);

  /* Internal citizen reports */
  const fetchCitizen = useCallback(async () => {
    setLoad('cr', true);
    try {
      const res = await api.get('/reports?status=Pending&pageSize=5');
      setCitizen(res.data?.items || res.data || []);
      setErr('cr', null);
    } catch {
      setCitizen([]);
      setErr('cr', null);
    }
    finally { setLoad('cr', false); }
  }, []);

  const refresh = useCallback(() => {
    fetchEarthquakes();
    fetchWeather();
    fetchGlide();
    fetchReliefWeb();
    fetchHdx();
    fetchCitizen();
    setLastRefresh(new Date());
  }, [fetchEarthquakes, fetchWeather, fetchGlide, fetchReliefWeb, fetchHdx, fetchCitizen]);

  useEffect(() => { refresh(); }, [refresh]);

  /* ── Styles ── */
  const card = {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: 'var(--shadow-sm)',
  };
  const skel = {
    background: 'var(--bg-surface-2)',
    borderRadius: '10px', height: '80px',
    marginBottom: '12px',
    animation: 'skeleton-pulse 1.5s ease-in-out infinite',
  };
  const sectionTitle = (icon, text, badge) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
      {icon}
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
        {text}
      </h2>
      {badge && (
        <span style={{ fontSize: '11px', color: '#38a169', fontWeight: 700, background: 'rgba(39,174,96,0.1)', padding: '2px 8px', borderRadius: '6px' }}>
          {badge}
        </span>
      )}
    </div>
  );

  const errBanner = (msg) => msg ? (
    <div style={{ padding: '12px 16px', background: 'rgba(229,62,62,0.07)', border: '1px solid rgba(229,62,62,0.2)', borderRadius: '12px', color: '#e53e3e', fontSize: '13px', marginBottom: '12px' }}>
      ⚠ {msg}
    </div>
  ) : null;

  const createBtn = (label, url, color = 'var(--accent)') => (
    <button
      onClick={() => navigate(url)}
      style={{
        display: 'flex', alignItems: 'center', gap: '5px',
        padding: '7px 13px', borderRadius: '8px',
        background: `${color}18`, border: `1.5px solid ${color}`,
        color, fontSize: '12px', fontWeight: 700, cursor: 'pointer',
        transition: 'all 0.15s', whiteSpace: 'nowrap',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = color; e.currentTarget.style.color = '#fff'; }}
      onMouseLeave={e => { e.currentTarget.style.background = `${color}18`; e.currentTarget.style.color = color; }}
    >
      <Shield size={12} /> {label}
    </button>
  );

  /* ── Integration catalog ── */
  const catalog = [
    { name: 'USGS Earthquake Feed',     badge: '🟢 Live',    color: '#38a169', note: 'Real-time M2.5+ GeoJSON. Free, no key needed.' },
    { name: 'Open-Meteo Weather',       badge: '🟢 Live',    color: '#38a169', note: 'Real current weather for all Pakistan cities. Free.' },
    { name: 'ReliefWeb API v2',         badge: '🟢 Live',    color: '#38a169', note: 'UN humanitarian disaster database. Free POST API.' },
    { name: 'HDX / GLIDE Events',       badge: '🟢 Live',    color: '#38a169', note: 'CKAN humanitarian data API — Pakistan disaster records.' },
    { name: 'Internal Citizen Reports', badge: '🟢 Live',    color: '#3182ce', note: 'Your platform pending reports feed.' },
    { name: 'NDMA (ndma.gov.pk)',       badge: '🟡 Manual',  color: '#d69e2e', note: 'Primary Pakistan authority. No public API — link provided.' },
    { name: 'RIMES (rimes.int)',        badge: '🟡 Manual',  color: '#d69e2e', note: 'Regional early warning. No live API — link provided.' },
    { name: 'HDX HAPI',                badge: '🟡 Static',  color: '#d69e2e', note: 'For humanitarian interoperability analytics, not real-time.' },
    { name: 'PDMA Alerts',             badge: '🔴 No API',  color: '#e53e3e', note: 'No public live feed. Manual entry from bulletins.' },
    { name: 'Rescue 1122',             badge: '🔴 No API',  color: '#e53e3e', note: 'Field confirmations only — no public API.' },
  ];

  return (
    <div style={{ maxWidth: '1300px', margin: '0 auto', padding: '88px 24px 60px', minHeight: '100vh' }}>

      {/* ── Header ── */}
      <div style={{
        ...card, marginBottom: '28px',
        background: 'linear-gradient(135deg, rgba(39,174,96,0.06), rgba(33,97,140,0.06))',
        animation: 'fadeInUp 0.4s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '52px', height: '52px',
              background: 'linear-gradient(135deg, var(--pk-green-600), var(--pk-green-400))',
              borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(39,174,96,0.3)',
            }}>
              <Activity size={26} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Official Monitoring Center
              </h1>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                Live feeds — USGS · Open-Meteo · ReliefWeb · HDX/GLIDE · NDMA · RIMES · Internal Reports
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {lastRefresh && (
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={12} /> {lastRefresh.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button
              onClick={refresh}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px',
                background: 'var(--accent-subtle)', border: '1.5px solid var(--accent)',
                borderRadius: '10px', cursor: 'pointer', color: 'var(--accent)',
                fontSize: '13px', fontWeight: 700, transition: 'all 0.15s',
              }}
            >
              <RefreshCw size={14} /> Refresh All
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', alignItems: 'flex-start' }}>

        {/* ═══ LEFT: Live Data Feeds ═══ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

          {/* ── 1. USGS Earthquakes ── */}
          <section>
            {sectionTitle(<Globe size={20} color="#e53e3e" />, '🌍 USGS — Pakistan Earthquakes (M2.5+)', 'LIVE')}
            {errBanner(errors.eq)}
            {loading.eq && [1,2,3].map(i => <div key={i} style={skel} />)}
            {!loading.eq && earthquakes.length === 0 && !errors.eq && (
              <div style={{ ...card, textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '28px' }}>
                ✅ No M2.5+ earthquakes near Pakistan in the last 24 hours.
              </div>
            )}
            <div style={{ display: 'grid', gap: '12px' }}>
              {earthquakes.map(q => {
                const p = q.properties;
                const [lon, lat, depth] = q.geometry.coordinates;
                const mag   = p.mag?.toFixed(1);
                const sev   = p.mag >= 6 ? 'Critical' : p.mag >= 5 ? 'High' : 'Medium';
                const color = SEV_COLOR[sev];
                const loc   = p.place || 'Pakistan Region';
                const time  = new Date(p.time).toLocaleString('en-PK', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                return (
                  <div key={q.id} style={{ ...card, borderLeft: `5px solid ${color}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                          <span style={{ fontSize: '22px', fontWeight: 900, color, fontFamily: 'var(--font-display)' }}>M{mag}</span>
                          <span style={{ fontSize: '11px', fontWeight: 700, background: `${color}18`, color, padding: '3px 8px', borderRadius: '6px' }}>{sev}</span>
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>📍 {loc}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Depth: {depth?.toFixed(0)} km · {time}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <a href={p.url} target="_blank" rel="noopener noreferrer"
                          style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 13px', borderRadius: '8px', background: 'var(--bg-surface-2)', border: '1.5px solid var(--border)', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '12px', fontWeight: 600 }}>
                          <ExternalLink size={12} /> USGS
                        </a>
                        {createBtn('Create Incident',
                          `/create-official-incident?type=Earthquake&severity=${sev}&locationName=${encodeURIComponent(loc)}&latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&source=USGS Earthquake API`,
                          color)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── 2. Open-Meteo Weather ── */}
          <section>
            {sectionTitle(<CloudSun size={20} color="#d69e2e" />, '☁️ Open-Meteo — Pakistan Cities', 'LIVE')}
            {errBanner(errors.wx)}
            {loading.wx && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))', gap: '12px' }}>
                {[1,2,3,4,5,6].map(i => <div key={i} style={{ ...skel, height: '110px', marginBottom: 0 }} />)}
              </div>
            )}
            {!loading.wx && weather.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))', gap: '12px' }}>
                {weather.map(w => {
                  const wc   = weatherCode(w.wmo ?? 0);
                  const tSev = tempSeverity(w.temp);
                  const alertSev = wc.severity || tSev;
                  const alertColor = alertSev ? SEV_COLOR[alertSev] : 'var(--border)';
                  const dtype = w.temp >= 43 ? 'Heatwave' : w.temp <= -3 ? 'ColdWave' : (w.wmo ?? 0) >= 80 ? 'Storm' : null;
                  return (
                    <div key={w.city} style={{ ...card, borderTop: `4px solid ${alertColor}`, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{w.city}</span>
                        <span style={{ fontSize: '22px' }}>{wc.emoji}</span>
                      </div>
                      <div style={{ fontSize: '24px', fontWeight: 900, color: tSev ? SEV_COLOR[tSev] : 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                        {w.temp !== undefined ? `${w.temp}°C` : '—'}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{wc.label}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>💨 {w.wind} km/h · 🌧 {w.precip} mm</div>
                      {alertSev && dtype && (
                        <button
                          onClick={() => navigate(`/create-official-incident?type=${dtype}&severity=${alertSev}&locationName=${encodeURIComponent(w.city)}&latitude=${w.lat}&longitude=${w.lon}&source=OpenWeather API`)}
                          style={{ marginTop: '4px', padding: '6px 10px', background: `${alertColor}18`, border: `1.5px solid ${alertColor}`, borderRadius: '8px', color: alertColor, fontSize: '11px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.background = alertColor; e.currentTarget.style.color = '#fff'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = `${alertColor}18`; e.currentTarget.style.color = alertColor; }}
                        >
                          🛡️ Create {dtype} Incident
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── 3. ReliefWeb ── */}
          <section>
            {sectionTitle(<BookOpen size={20} color="#4299e1" />, '📰 ReliefWeb — Pakistan Disasters', 'LIVE')}
            {errBanner(errors.rw)}
            {loading.rw && [1,2,3].map(i => <div key={i} style={skel} />)}
            {!loading.rw && reliefWebItems.length === 0 && (
              <div style={{ ...card, textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '24px' }}>
                {errors.rw ? '⚠ Could not load ReliefWeb data.' : '✅ No recent Pakistan disaster entries on ReliefWeb.'}
                <br />
                <a href="https://reliefweb.int/disasters?search=pakistan" target="_blank" rel="noopener noreferrer"
                  style={{ color: 'var(--accent)', fontSize: '12px', marginTop: '8px', display: 'inline-block' }}>
                  View on ReliefWeb →
                </a>
              </div>
            )}
            <div style={{ display: 'grid', gap: '12px' }}>
              {reliefWebItems.map((item, i) => {
                const f    = item.fields || {};
                const type = f.type?.[0]?.name || 'Disaster';
                const date = f.date?.created ? new Date(f.date.created).toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
                const status = f.status || 'current';
                const statusColor = status === 'current' ? '#e53e3e' : status === 'alert' ? '#dd6b20' : '#38a169';
                return (
                  <div key={i} style={{ ...card, borderLeft: `5px solid ${statusColor}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, background: `${statusColor}18`, color: statusColor, padding: '2px 8px', borderRadius: '6px', textTransform: 'capitalize' }}>{status}</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{type} · {date}</span>
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                          {f.name || item.href}
                        </div>
                        {f.glide && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>GLIDE: {f.glide}</div>}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <a href={`https://reliefweb.int${item.href}`} target="_blank" rel="noopener noreferrer"
                          style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '7px 12px', borderRadius: '8px', background: 'var(--bg-surface-2)', border: '1.5px solid var(--border)', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '12px', fontWeight: 600 }}>
                          <ExternalLink size={12} /> ReliefWeb
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── 4. HDX / GLIDE Events ── */}
          <section>
            {sectionTitle(<Database size={20} color="#805ad5" />, '📊 HDX / GLIDE — Pakistan Disaster Events', 'LIVE')}
            {errBanner(errors.glide)}
            {loading.glide && [1,2,3].map(i => <div key={i} style={skel} />)}
            {!loading.glide && glideEvents.length === 0 && (
              <div style={{ ...card, textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '24px' }}>
                <div style={{ marginBottom: '8px' }}>GLIDE datastore query returned no results. Browse directly:</div>
                <a href="https://data.humdata.org/dataset/pak-glide-events" target="_blank" rel="noopener noreferrer"
                  style={{ color: 'var(--accent)', fontWeight: 600 }}>View Pakistan GLIDE Events on HDX →</a>
              </div>
            )}
            <div style={{ display: 'grid', gap: '12px' }}>
              {glideEvents.map((ev, i) => {
                const code = ev.event?.slice(0, 2) || 'OT';
                const info = GLIDE_EVENT_MAP[code] || { label: ev.event, type: 'Other', emoji: '⚠️' };
                const sevColor = ev.killed > 50 ? '#e53e3e' : ev.killed > 10 ? '#dd6b20' : '#d69e2e';
                const severity = ev.killed > 50 ? 'Critical' : ev.killed > 10 ? 'High' : 'Medium';
                const loc = ev.location || 'Pakistan';
                return (
                  <div key={i} style={{ ...card, borderLeft: `5px solid ${sevColor}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <span style={{ fontSize: '20px' }}>{info.emoji}</span>
                          <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{info.label}</span>
                          <span style={{ fontSize: '11px', background: `${sevColor}18`, color: sevColor, fontWeight: 700, padding: '2px 7px', borderRadius: '5px' }}>{severity}</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{ev.year}</span>
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                          📍 {loc}
                          {ev.killed ? <span style={{ marginLeft: '12px', color: '#e53e3e', fontWeight: 600 }}>☠ {ev.killed} killed</span> : null}
                          {ev.affected ? <span style={{ marginLeft: '12px', color: '#dd6b20', fontWeight: 600 }}>👥 {ev.affected?.toLocaleString()} affected</span> : null}
                        </div>
                        {ev.glidenumber && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>GLIDE: {ev.glidenumber}</div>}
                      </div>
                      {createBtn('Create Incident',
                        `/create-official-incident?type=${info.type}&severity=${severity}&locationName=${encodeURIComponent(loc)}&source=NDMA Bulletin`,
                        sevColor)}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── 5. NDMA + RIMES info panels ── */}
          <section>
            {sectionTitle(<Radio size={20} color="#d69e2e" />, '🏛️ NDMA & RIMES — Official Authority Feeds')}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* NDMA */}
              <div style={{ ...card, borderTop: '4px solid #38a169' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg,#145c33,#27ae60)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Shield size={20} color="#fff" />
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>NDMA</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ndma.gov.pk</div>
                  </div>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 12px' }}>
                  Pakistan's <strong>official disaster management authority</strong>. Publishes bulletins, situation reports, and alerts. No live public API — use the bulletin link below.
                </p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <a href="https://ndma.gov.pk/alerts/" target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 12px', borderRadius: '8px', background: 'rgba(39,174,96,0.1)', border: '1.5px solid #27ae60', color: '#27ae60', textDecoration: 'none', fontSize: '12px', fontWeight: 600 }}>
                    <ExternalLink size={12} /> Live Alerts
                  </a>
                  <a href="https://ndma.gov.pk/situation-reports/" target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 12px', borderRadius: '8px', background: 'var(--bg-surface-2)', border: '1.5px solid var(--border)', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '12px', fontWeight: 600 }}>
                    <BookOpen size={12} /> Sit-Reps
                  </a>
                  {createBtn('Enter Manually', '/create-official-incident?source=NDMA Bulletin', '#27ae60')}
                </div>
              </div>

              {/* RIMES */}
              <div style={{ ...card, borderTop: '4px solid #3182ce' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg,#1a365d,#3182ce)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AlertCircle size={20} color="#fff" />
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>RIMES</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>rimes.int</div>
                  </div>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 12px' }}>
                  <strong>Regional Integrated Multi-Hazard Early Warning System</strong>. Publishes seasonal outlooks, climate bulletins, and flood/drought early warning for South Asia.
                </p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <a href="https://www.rimes.int/data-services/seasonal-outlook/" target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 12px', borderRadius: '8px', background: 'rgba(49,130,206,0.1)', border: '1.5px solid #3182ce', color: '#3182ce', textDecoration: 'none', fontSize: '12px', fontWeight: 600 }}>
                    <ExternalLink size={12} /> Seasonal Outlook
                  </a>
                  <a href="https://www.rimes.int/news/" target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 12px', borderRadius: '8px', background: 'var(--bg-surface-2)', border: '1.5px solid var(--border)', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '12px', fontWeight: 600 }}>
                    <BookOpen size={12} /> Bulletins
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* ── 6. Internal Citizen Reports ── */}
          <section>
            {sectionTitle(<Users size={20} color="#3182ce" />, '👥 Pending Citizen Reports', 'LIVE')}
            {loading.cr && [1,2].map(i => <div key={i} style={skel} />)}
            {!loading.cr && citizenReports.length === 0 && (
              <div style={{ ...card, textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '24px' }}>
                ✅ No pending citizen reports at this time.
              </div>
            )}
            <div style={{ display: 'grid', gap: '12px' }}>
              {citizenReports.map((r, i) => (
                <div key={r.id ?? i} style={{ ...card, borderLeft: '5px solid #3182ce' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                        {r.type || 'Unknown'} — {r.locationName || 'Unknown location'}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                        {r.description?.slice(0, 120) || 'No description.'}{r.description?.length > 120 ? '…' : ''}
                      </div>
                    </div>
                    {createBtn('Make Official',
                      `/create-official-incident?type=${r.type || 'Other'}&severity=${r.severity || 'High'}&locationName=${encodeURIComponent(r.locationName || '')}&latitude=${r.latitude || ''}&longitude=${r.longitude || ''}&source=Citizen Reports Feed`,
                      '#3182ce')}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ═══ RIGHT: Catalog ═══ */}
        <div style={{ position: 'sticky', top: '80px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '14px' }}>
              API Integration Status
            </h2>
            <div style={{ ...card, padding: '18px' }}>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.5 }}>
                Real-time vs. manual data sources — all free.
              </p>
              <div style={{ display: 'grid', gap: '12px' }}>
                {catalog.map((c, i) => (
                  <div key={i} style={{ borderBottom: i === catalog.length - 1 ? 'none' : '1px solid var(--border)', paddingBottom: i === catalog.length - 1 ? 0 : '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{c.name}</span>
                      <span style={{ fontSize: '10px', fontWeight: 700, background: `${c.color}18`, color: c.color, padding: '2px 7px', borderRadius: '4px', whiteSpace: 'nowrap' }}>{c.badge}</span>
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>{c.note}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick links */}
          <div style={{ ...card, background: 'rgba(39,174,96,0.05)', border: '1px solid rgba(39,174,96,0.2)', padding: '18px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Wifi size={14} /> Data Sources
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { label: 'USGS Earthquakes', url: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson' },
                { label: 'Open-Meteo API',   url: 'https://open-meteo.com' },
                { label: 'ReliefWeb API',    url: 'https://apidoc.reliefweb.int' },
                { label: 'HDX GLIDE Events', url: 'https://data.humdata.org/dataset/pak-glide-events' },
                { label: 'HDX HAPI Docs',    url: 'https://hapi.humdata.org' },
                { label: 'NDMA Alerts',      url: 'https://ndma.gov.pk/alerts/' },
                { label: 'RIMES Outlooks',   url: 'https://www.rimes.int/data-services/seasonal-outlook/' },
              ].map(l => (
                <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent)', fontSize: '12px', textDecoration: 'none', fontWeight: 500 }}>
                  <ExternalLink size={11} /> {l.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
