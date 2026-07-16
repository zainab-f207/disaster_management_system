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
  const [hdxDatasets, setHdxDatasets]   = useState([]);
  const [citizenReports, setCitizenReports] = useState([]);
  const [newsFeeds, setNewsFeeds]       = useState([]);
  const [pmdFeeds, setPmdFeeds]         = useState([]);
  const [floodForecast, setFloodForecast] = useState([]);

  const [loading, setLoading] = useState({
    eq: true, wx: true, glide: true, rw: true, hdx: true, cr: true, news: true, pmd: true, flood: true,
  });
  const [errors, setErrors] = useState({});
  const [lastRefresh, setLastRefresh] = useState(null);
  const [selectedWeather, setSelectedWeather] = useState(null);
  const [feedModal, setFeedModal] = useState(null);

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
                   `&current=temperature_2m,apparent_temperature,relative_humidity_2m,weathercode,` +
                   `windspeed_10m,wind_gusts_10m,precipitation,rain,uv_index&timezone=Asia%2FKarachi`;
      const res  = await fetch(url);
      const json = await res.json();
      const arr  = Array.isArray(json) ? json : [json];
      setWeather(PK_CITIES.map((city, i) => ({
        city: city.name, lat: city.lat, lon: city.lon,
        temp:      arr[i]?.current?.temperature_2m,
        feelsLike: arr[i]?.current?.apparent_temperature,
        humidity:  arr[i]?.current?.relative_humidity_2m,
        wmo:       arr[i]?.current?.weathercode,
        wind:      arr[i]?.current?.windspeed_10m,
        gusts:     arr[i]?.current?.wind_gusts_10m,
        precip:    arr[i]?.current?.precipitation,
        rain:      arr[i]?.current?.rain,
        uvIndex:   arr[i]?.current?.uv_index,
      })));
      setErr('wx', null);
    } catch { setErr('wx', 'Open-Meteo unreachable.'); }
    finally  { setLoad('wx', false); }
  }, []);

  /* HDX GLIDE Events for Pakistan — free CKAN API */
  const fetchGlide = useCallback(async () => {
    setLoad('glide', true);
    try {
      const res = await api.get('/geocoding/historical-events');
      const csvText = res.data;
      const records = parseCSV(csvText);
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

  /* ReliefWeb — proxied through .NET backend */
  const fetchReliefWeb = useCallback(async () => {
    setLoad('rw', true);
    try {
      const res = await api.get('/monitoring/reliefweb');
      const json = res.data;
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
      const res = await fetch('https://data.humdata.org/api/3/action/package_search?q=pakistan&rows=4&sort=metadata_modified%20desc');
      const json = await res.json();
      if (json.success) setHdxDatasets(json.result.results);
      setErr('hdx', null);
    } catch {
      setHdxDatasets([]);
      setErr('hdx', 'Failed to fetch HDX datasets.');
    }
    finally { setLoad('hdx', false); }
  }, []);

  /* Google News RSS — Proxied to bypass CORS */
  const fetchNewsRss = useCallback(async () => {
    setLoad('news', true);
    try {
      const res = await api.get('/monitoring/news-rss', { responseType: 'text' });
      const xmlDoc = new window.DOMParser().parseFromString(res.data, "text/xml");
      const items = Array.from(xmlDoc.querySelectorAll("item")).map(item => ({
        title: item.querySelector("title")?.textContent || '',
        link: item.querySelector("link")?.textContent || '',
        pubDate: item.querySelector("pubDate")?.textContent || ''
      }));
      // Sort newest first
      items.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
      setNewsFeeds(items);
      setErr('news', null);
    } catch {
      setNewsFeeds([]);
      setErr('news', 'Could not load OSINT news feed.');
    }
    finally { setLoad('news', false); }
  }, []);

  /* PMD CAP RSS */
  const fetchPmdRss = useCallback(async () => {
    setLoad('pmd', true);
    try {
      const res = await api.get('/monitoring/pmd-rss', { responseType: 'text' });
      const xmlDoc = new window.DOMParser().parseFromString(res.data, "text/xml");
      const items = Array.from(xmlDoc.querySelectorAll("item")).map(item => ({
        title: item.querySelector("title")?.textContent || '',
        link: item.querySelector("link")?.textContent || '',
        pubDate: item.querySelector("pubDate")?.textContent || ''
      }));
      // Sort newest first
      items.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
      setPmdFeeds(items);
      setErr('pmd', null);
    } catch {
      setPmdFeeds([]);
      setErr('pmd', 'Could not load PMD alerts feed.');
    }
    finally { setLoad('pmd', false); }
  }, []);

  /* Flood Forecast — PMD FFD via .NET proxy */
  const fetchFloodForecast = useCallback(async () => {
    setLoad('flood', true);
    try {
      const res = await api.get('/monitoring/flood-forecast');
      setFloodForecast(res.data?.data || []);
    } catch {
      setFloodForecast([]);
    }
    finally { setLoad('flood', false); }
  }, []);

  /* Internal citizen reports */
  const fetchCitizenReports = useCallback(async () => {
    setLoad('cr', true);
    try {
      const res = await api.get('/reports?status=Pending&pageSize=5');
      setCitizenReports(res.data?.items || res.data || []);
      setErr('cr', null);
    } catch {
      setCitizenReports([]);
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
    fetchNewsRss();
    fetchPmdRss();
    fetchFloodForecast();
    fetchCitizenReports();
    setLastRefresh(new Date());
  }, [fetchEarthquakes, fetchWeather, fetchGlide, fetchReliefWeb, fetchHdx, fetchCitizenReports, fetchNewsRss, fetchPmdRss, fetchFloodForecast]);

  useEffect(() => { refresh(); }, [refresh]);

  /* ── Auto-refresh: live feeds every 60s, RSS every 5 min ── */
  useEffect(() => {
    const liveInterval = setInterval(() => {
      fetchEarthquakes();
      fetchWeather();
      fetchCitizenReports();
    }, 60_000); // every 60 seconds

    const rssInterval = setInterval(() => {
      fetchReliefWeb();
      fetchNewsRss();
      fetchPmdRss();
      fetchFloodForecast();
      setLastRefresh(new Date());
    }, 5 * 60_000); // every 5 minutes

    return () => {
      clearInterval(liveInterval);
      clearInterval(rssInterval);
    };
  }, [fetchEarthquakes, fetchWeather, fetchCitizenReports, fetchReliefWeb, fetchNewsRss, fetchPmdRss, fetchFloodForecast]);

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

  /* ── Integration catalog (accurate, real-data only) ── */
  const catalog = [
    { name: 'USGS Earthquake Feed',     badge: '🟢 Live',    color: '#38a169', note: 'Real-time M2.5+ GeoJSON filtered to Pakistan bounds. Updates every ~1 min from USGS.' },
    { name: 'Open-Meteo Weather',       badge: '🟢 Live',    color: '#38a169', note: 'Actual current weather for 6 Pakistan cities. Free, no API key.' },
    { name: 'ReliefWeb RSS',            badge: '🟢 Live',    color: '#38a169', note: 'UN humanitarian disaster database. Proxied by backend RSS parser. Auto-refreshes every 5 min.' },
    { name: 'HDX / GLIDE Events',       badge: '📚 Archive', color: '#805ad5', note: 'Pakistan GLIDE historical archive 1990–present. Downloaded from HDX CKAN on demand.' },
    { name: 'PMD CAP Alerts (RSS)',      badge: '🟢 Live',    color: '#38a169', note: 'Pakistan Met Dept Common Alerting Protocol RSS from AWS S3 bucket. Real bulletins.' },
    { name: 'PMD Flood Forecast (FFD)', badge: '🟢 Live',    color: '#38a169', note: 'PMD/NDMA flood bulletins parsed from the same CAP RSS feed. Severity auto-detected.' },
    { name: 'Google News RSS (OSINT)',  badge: '🟢 Live',    color: '#3182ce', note: 'Man-made disaster headlines for Pakistan. Proxied server-side. Auto-refreshes every 5 min.' },
    { name: 'Internal Citizen Reports', badge: '🟢 Live',    color: '#3182ce', note: 'Pending reports from citizens on your platform. Refreshes every 60 seconds.' },
    { name: 'Rescue 1122',              badge: '🔴 No API',  color: '#e53e3e', note: 'No public API. Field confirmations only — incidents created manually by admins.' },
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
                Live feeds — USGS · Open-Meteo · ReliefWeb · News RSS · PMD · Citizen Reports
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
                  const wc       = weatherCode(w.wmo ?? 0);
                  const tSev     = tempSeverity(w.temp);
                  const alertSev = wc.severity || tSev;
                  const alertColor = alertSev ? SEV_COLOR[alertSev] : 'var(--border)';
                  const dtype    = w.temp >= 43 ? 'Heatwave' : w.temp <= -3 ? 'ColdWave' : (w.wmo ?? 0) >= 80 ? 'Storm' : null;
                  return (
                    <button
                      key={w.city}
                      onClick={() => setSelectedWeather(w)}
                      style={{ ...card, borderTop: `4px solid ${alertColor}`, display: 'flex', flexDirection: 'column', gap: '6px', cursor: 'pointer', textAlign: 'left', width: '100%', background: 'var(--bg-elevated)', transition: 'transform 0.15s, box-shadow 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.12)'; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{w.city}</span>
                        <span style={{ fontSize: '22px' }}>{wc.emoji}</span>
                      </div>
                      <div style={{ fontSize: '24px', fontWeight: 900, color: tSev ? SEV_COLOR[tSev] : 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                        {w.temp !== undefined ? `${w.temp}°C` : '—'}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{wc.label}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>💨 {w.wind} km/h · 🌧 {w.precip} mm</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', opacity: 0.7 }}>Click for details</div>
                      {alertSev && dtype && (
                        <button
                          onClick={e => { e.stopPropagation(); navigate(`/create-official-incident?type=${dtype}&severity=${alertSev}&locationName=${encodeURIComponent(w.city)}&latitude=${w.lat}&longitude=${w.lon}&source=OpenWeather API`); }}
                          style={{ marginTop: '4px', padding: '6px 10px', background: `${alertColor}18`, border: `1.5px solid ${alertColor}`, borderRadius: '8px', color: alertColor, fontSize: '11px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.background = alertColor; e.currentTarget.style.color = '#fff'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = `${alertColor}18`; e.currentTarget.style.color = alertColor; }}
                        >
                          🛡️ Create {dtype} Incident
                        </button>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── 3. Historical & Major Disasters (ReliefWeb & HDX/GLIDE) ── */}
          <section>
            {sectionTitle(<BookOpen size={20} color="#805ad5" />, '📚 Historical & Major Disasters (ReliefWeb & HDX)')}
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
              {/* ReliefWeb RSS Feed */}
              <div style={{ ...card, padding: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  📰 ReliefWeb Updates
                </div>
                {errBanner(errors.rw)}
                {loading.rw && [1,2].map(i => <div key={i} style={{...skel, height: '40px'}} />)}
                {!loading.rw && reliefWebItems.length === 0 && (
                  <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                    {errors.rw ? '⚠ Could not load ReliefWeb data.' : '✅ No recent Pakistan disaster entries on ReliefWeb.'}
                  </div>
                )}
                <div style={{ display: 'grid', gap: '8px' }}>
                  {reliefWebItems.map((item, i) => {
                    const f    = item.fields || {};
                    const type = f.type?.[0]?.name || 'Disaster';
                    const date = f.date ? new Date(f.date).toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
                    const status = f.status || 'current';
                    const statusColor = status === 'current' ? '#e53e3e' : status === 'alert' ? '#dd6b20' : '#38a169';
                    return (
                      <a key={i} href={item.fields?.url || `https://reliefweb.int${item.href}`} target="_blank" rel="noopener noreferrer" 
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-surface-2)', borderRadius: '8px', borderLeft: `4px solid ${statusColor}`, textDecoration: 'none', transition: 'background 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-surface-3)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-surface-2)'}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '10px', fontWeight: 700, background: `${statusColor}18`, color: statusColor, padding: '2px 6px', borderRadius: '4px', textTransform: 'capitalize' }}>{status}</span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{type} · {date}</span>
                          </div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {f.name || item.href}
                          </div>
                        </div>
                        <ExternalLink size={14} color="var(--text-muted)" />
                      </a>
                    );
                  })}
                </div>
              </div>

              {/* HDX / GLIDE Historical Data Link */}
              <div style={{ ...card, padding: '16px', background: 'linear-gradient(135deg,rgba(128,90,213,0.07),rgba(49,130,206,0.06))', border: '1.5px solid rgba(128,90,213,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    📊 GLIDE Events & Historical Charts
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Access complete historical datastores and interactive charts for past Pakistan disasters (fatalities, affected populations).
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <a href="https://data.humdata.org/dataset/pak-glide-events" target="_blank" rel="noopener noreferrer"
                    style={{ padding: '8px 16px', background: 'transparent', border: '1.5px solid #805ad5', borderRadius: '8px', color: '#805ad5', fontSize: '12px', fontWeight: 700, cursor: 'pointer', textDecoration: 'none' }}
                  >
                    HDX Datastore
                  </a>
                  <button
                    onClick={() => navigate('/disasters')}
                    style={{ padding: '8px 16px', background: '#805ad5', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer', transition: 'opacity 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                  >
                    Open Charts →
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* ── 4. Secondary Monitoring Feeds (PMD & News RSS) ── */}
          <section>
            {sectionTitle(<Radio size={20} color="#d69e2e" />, '🌐 PMD & OSINT / News Monitoring')}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* PMD */}
              <div style={{ ...card, borderTop: '4px solid #dd6b20' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg,#9c4221,#dd6b20)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Shield size={20} color="#fff" />
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>PMD Warnings</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>pmd.gov.pk</div>
                  </div>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 12px' }}>
                  <strong>Pakistan Meteorological Department</strong>. Official early warnings for floods, cyclones, droughts, and heatwaves. Crucial for natural disaster forecasting.
                </p>
                {loading.pmd ? (
                  [1,2].map(i => <div key={i} style={{ ...skel, height: '30px' }} />)
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                    {pmdFeeds.length > 0 ? pmdFeeds.slice(0, 3).map((feed, i) => (
                      <div key={i} style={{ padding: '8px 12px', background: 'var(--bg-surface-2)', borderRadius: '8px', borderLeft: '3px solid #dd6b20' }}>
                        <a href={feed.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', textDecoration: 'none', display: 'block', marginBottom: '4px' }}>
                          {feed.title}
                        </a>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          {new Date(feed.pubDate).toLocaleString()}
                        </div>
                      </div>
                    )) : (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No recent PMD alerts found.</div>
                    )}
                  </div>
                )}

                {/* Inline Flood Forecast */}
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#3182ce', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    🌊 Flood Forecasting Division
                    {loading.flood && <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 400 }}>Loading…</span>}
                  </div>
                  {!loading.flood && floodForecast.length === 0 && (
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '8px 12px', background: 'var(--bg-surface-2)', borderRadius: '8px' }}>
                      ℹ No active flood bulletins from PMD FFD at this time.
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
                    {floodForecast.slice(0, 6).map((b, i) => {
                      const sevColor = b.severity === 'High' ? '#e53e3e' : b.severity === 'Medium' ? '#dd6b20' : b.severity === 'Low' ? '#38a169' : '#3182ce';
                      const issued = b.pubDate ? new Date(b.pubDate).toLocaleString('en-PK', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
                      return (
                        <div key={i} style={{ padding: '10px 12px', background: 'var(--bg-surface-2)', borderRadius: '8px', borderLeft: `3px solid ${sevColor}` }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '10px', fontWeight: 700, background: `${sevColor}18`, color: sevColor, padding: '1px 7px', borderRadius: '4px' }}>{b.severity}</span>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{issued}</span>
                          </div>
                          <a href={b.link || 'https://www.pmd.gov.pk/en/'} target="_blank" rel="noopener noreferrer"
                            style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', textDecoration: 'none', display: 'block', marginBottom: b.areas?.length ? '4px' : 0, lineHeight: 1.4 }}>
                            {b.title}
                          </a>
                          {b.areas?.length > 0 && (
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                              {b.areas.map(a => (
                                <span key={a} style={{ fontSize: '10px', background: 'rgba(49,130,206,0.1)', color: '#3182ce', padding: '1px 6px', borderRadius: '4px' }}>📍 {a}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <a href="https://www.pmd.gov.pk/en/" target="_blank" rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 12px', borderRadius: '8px', background: 'rgba(221,107,32,0.1)', border: '1.5px solid #dd6b20', color: '#dd6b20', textDecoration: 'none', fontSize: '12px', fontWeight: 600 }}>
                      <ExternalLink size={12} /> PMD Website
                    </a>
                    <a href="https://ffd.pmd.gov.pk/" target="_blank" rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 12px', borderRadius: '8px', background: 'var(--bg-surface-2)', border: '1.5px solid var(--border)', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '12px', fontWeight: 600 }}>
                      <Database size={12} /> FFD Portal
                    </a>
                  </div>
                  {pmdFeeds.length > 3 && (
                    <button onClick={() => setFeedModal({ title: 'PMD Warnings', items: pmdFeeds, color: '#dd6b20' })} style={{ background: 'none', border: 'none', color: '#dd6b20', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                      View All →
                    </button>
                  )}
                </div>
              </div>

              {/* Google News */}
              <div style={{ ...card, borderTop: '4px solid #3182ce' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg,#1a365d,#3182ce)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Radio size={20} color="#fff" />
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Google News RSS (OSINT)</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>news.google.com</div>
                  </div>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 12px' }}>
                  <strong>Man-Made Disaster Monitoring</strong> — Unconfirmed headlines for fires, building collapses, explosions, or industrial accidents in Pakistan.
                </p>
                {loading.news ? (
                  [1,2].map(i => <div key={i} style={{ ...skel, height: '30px' }} />)
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {newsFeeds.slice(0, 5).map((feed, i) => (
                      <div key={i} style={{ padding: '8px 12px', background: 'var(--bg-surface-2)', borderRadius: '8px', borderLeft: '3px solid #3182ce' }}>
                        <a href={feed.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', textDecoration: 'none', display: 'block', marginBottom: '4px' }}>
                          {feed.title}
                        </a>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          {new Date(feed.pubDate).toLocaleString()}
                        </div>
                      </div>
                    ))}
                    {newsFeeds.length > 5 && (
                      <button onClick={() => setFeedModal({ title: 'Google News (OSINT)', items: newsFeeds, color: '#3182ce' })} style={{ alignSelf: 'flex-end', background: 'none', border: 'none', color: '#3182ce', fontSize: '12px', fontWeight: 700, cursor: 'pointer', marginTop: '4px' }}>
                        View All →
                      </button>
                    )}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
                  <a href="https://news.google.com/search?q=Pakistan%20(flood%20OR%20earthquake%20OR%20explosion%20OR%20landslide)" target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 12px', borderRadius: '8px', background: 'rgba(49,130,206,0.1)', border: '1.5px solid #3182ce', color: '#3182ce', textDecoration: 'none', fontSize: '12px', fontWeight: 600 }}>
                    <ExternalLink size={12} /> Live News Search
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
                { label: 'ReliefWeb RSS',    url: 'https://reliefweb.int/disasters/rss.xml?search=country.iso3:pak' },
                { label: 'HDX GLIDE Events', url: 'https://data.humdata.org/dataset/pak-glide-events' },
                { label: 'PMD CAP Alerts',   url: 'https://cap-sources.s3.amazonaws.com/pk-pmd-en/rss.xml' },
                { label: 'PMD Official',     url: 'https://www.pmd.gov.pk/en/' },
                { label: 'NDMA Pakistan',    url: 'https://www.ndma.gov.pk/' },
                { label: 'RIMES',            url: 'https://www.rimes.int/' },
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

      {/* ── Weather Detail Modal ── */}
      {selectedWeather && (() => {
        const w  = selectedWeather;
        const wc = weatherCode(w.wmo ?? 0);
        const tSev = tempSeverity(w.temp);
        const alertSev = wc.severity || tSev;
        const alertColor = alertSev ? SEV_COLOR[alertSev] : 'var(--accent)';
        return (
          <div
            onClick={() => setSelectedWeather(null)}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'fadeInUp 0.2s ease',
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                borderRadius: '20px', padding: '28px 32px', minWidth: '340px', maxWidth: '420px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
                borderTop: `4px solid ${alertColor}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    {w.city} {wc.emoji}
                  </h3>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{wc.label}</div>
                </div>
                <button onClick={() => setSelectedWeather(null)}
                  style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border)', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  ✕
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
                {[
                  { label: 'Temperature',  value: w.temp     !== undefined ? `${w.temp}°C`     : '—', icon: '🌡️' },
                  { label: 'Feels Like',   value: w.feelsLike !== undefined ? `${w.feelsLike}°C` : '—', icon: '🤔' },
                  { label: 'Humidity',     value: w.humidity  !== undefined ? `${w.humidity}%`   : '—', icon: '💧' },
                  { label: 'Wind Speed',   value: w.wind      !== undefined ? `${w.wind} km/h`   : '—', icon: '💨' },
                  { label: 'Wind Gusts',   value: w.gusts     !== undefined ? `${w.gusts} km/h`  : '—', icon: '🌬️' },
                  { label: 'UV Index',     value: w.uvIndex   !== undefined ? `${w.uvIndex}`     : '—', icon: '☀️' },
                  { label: 'Rainfall',     value: w.rain      !== undefined ? `${w.rain} mm/hr`  : '—', icon: '🌧️' },
                  { label: 'Precipitation',value: w.precip    !== undefined ? `${w.precip} mm`   : '—', icon: '🌂' },
                ].map(({ label, value, icon }) => (
                  <div key={label} style={{ background: 'var(--bg-surface-2)', borderRadius: '10px', padding: '10px 12px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '3px' }}>{icon} {label}</div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>{value}</div>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5, borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                ⚙️ These thresholds are checked every 5 min by your monitoring service to auto-trigger alerts (rain ≥15 mm/hr · wind ≥60 km/h · heat ≥43°C).
              </p>
            </div>
          </div>
        );
      })()}

      {/* ── Feed Modal ── */}
      {feedModal && (
        <div
          onClick={() => setFeedModal(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'fadeInUp 0.2s ease', padding: '20px'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg-surface)', borderRadius: '16px',
              padding: '24px', width: '100%', maxWidth: '600px',
              maxHeight: '80vh', display: 'flex', flexDirection: 'column',
              boxShadow: '0 12px 48px rgba(0,0,0,0.2)', border: '1px solid var(--border)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '18px', fontWeight: 800, color: feedModal.color }}>{feedModal.title}</div>
              <button onClick={() => setFeedModal(null)} style={{ background: 'var(--bg-surface-2)', border: 'none', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                ✕
              </button>
            </div>
            
            <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px' }}>
              {feedModal.items.map((feed, i) => (
                <div key={i} style={{ padding: '12px 16px', background: 'var(--bg-surface-2)', borderRadius: '8px', borderLeft: `3px solid ${feedModal.color}` }}>
                  <a href={feed.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', textDecoration: 'none', display: 'block', marginBottom: '6px' }}>
                    {feed.title}
                  </a>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {new Date(feed.pubDate).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
