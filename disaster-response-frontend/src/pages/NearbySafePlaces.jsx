import { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation, Loader } from 'lucide-react';

const SAFE_PLACE_TYPES = [
  { key: 'hospital',  label: 'Hospitals',       emoji: '🏥', color: '#e53e3e', osmKey: 'amenity',         osmVal: 'hospital',      overpassType: 'hospital' },
  { key: 'shelter',   label: 'Shelters',         emoji: '🏠', color: '#3182ce', osmKey: 'social_facility', osmVal: 'shelter',       overpassType: 'shelter' },
  { key: 'police',    label: 'Police Stations',  emoji: '👮', color: '#2d3748', osmKey: 'amenity',         osmVal: 'police',        overpassType: 'police' },
  { key: 'fire',      label: 'Fire Stations',    emoji: '🚒', color: '#dd6b20', osmKey: 'amenity',         osmVal: 'fire_station',  overpassType: 'fire_station' },
  { key: 'pharmacy',  label: 'Pharmacies',       emoji: '💊', color: '#38a169', osmKey: 'amenity',         osmVal: 'pharmacy',      overpassType: 'pharmacy' },
];

/* ── Overpass mirror rotation + retry + in-memory cache ── */
const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.ru/api/interpreter',
];

const _cache = new Map(); // key: `lat,lon,radius` → { data, ts }
const CACHE_TTL = 10 * 60 * 1000; // 10 min

async function fetchOverpass(query, attempt = 0) {
  const mirror = OVERPASS_MIRRORS[attempt % OVERPASS_MIRRORS.length];
  const res = await fetch(mirror, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: query,
  });
  if (res.status === 429 || res.status === 504) {
    if (attempt >= OVERPASS_MIRRORS.length - 1) throw new Error('All Overpass mirrors busy');
    await new Promise(r => setTimeout(r, 800 * (attempt + 1)));
    return fetchOverpass(query, attempt + 1);
  }
  if (!res.ok) throw new Error(`Overpass ${res.status}`);
  return res.json();
}

async function getNearbySafePlaces(lat, lon, radius = 3000, osmTypes) {
  const key = `${lat.toFixed(3)},${lon.toFixed(3)},${radius},${osmTypes.map(t => t.osmVal).join('+')}`;
  const cached = _cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  const unionQuery = osmTypes.map(t =>
    `node["${t.osmKey}"="${t.osmVal}"](around:${radius},${lat},${lon});` +
    `way["${t.osmKey}"="${t.osmVal}"](around:${radius},${lat},${lon});`
  ).join('');
  const query = `[out:json][timeout:20];(${unionQuery});out center;`;

  try {
    const data = await fetchOverpass(query);
    _cache.set(key, { data, ts: Date.now() });
    return data;
  } catch (err) {
    if (cached) return cached.data; // graceful stale fallback
    throw err;
  }
}

/* ── GPS drift guard: only re-fetch when coords move > ~50 m ── */
function coordsMovedSignificantly(a, b, thresholdM = 50) {
  if (!a || !b) return true;
  const dLat = (b[0] - a[0]) * 111320;
  const dLon = (b[1] - a[1]) * 111320 * Math.cos(a[0] * Math.PI / 180);
  return Math.hypot(dLat, dLon) > thresholdM;
}

function makeIcon(emoji, color) {
  return L.divIcon({
    html: `<div style="font-size:22px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));background:${color}20;padding:4px;border-radius:8px;border:2px solid ${color}60">${emoji}</div>`,
    className: '', iconSize: [36, 36], iconAnchor: [18, 18],
  });
}

export default function NearbySafePlaces() {
  const [position, setPosition]         = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [places, setPlaces]             = useState([]);
  const [loading, setLoading]           = useState(false);
  const [selectedTypes, setSelectedTypes] = useState(['hospital', 'shelter', 'police']);
  const [radius, setRadius]             = useState(3000); // 3 km

  // track last-fetched position to avoid re-fetching on GPS micro-drift
  const lastFetchedPos = useRef(null);

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported by this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => setPosition([pos.coords.latitude, pos.coords.longitude]),
      () => {
        setPosition([31.5204, 74.3587]); // Default: Lahore
        setLocationError('Location access denied — showing Lahore. Enable location for accurate results.');
      },
      { timeout: 8000 }
    );
  }, []);

  const fetchNearby = useCallback(async (pos, rad, types) => {
    if (!pos) return;
    // Skip if coords haven't moved meaningfully
    if (!coordsMovedSignificantly(lastFetchedPos.current, pos) &&
        lastFetchedPos.current !== null) return;

    setLoading(true);
    const [lat, lon] = pos;
    const osmTypes = SAFE_PLACE_TYPES.filter(t => types.includes(t.key));
    try {
      const json = await getNearbySafePlaces(lat, lon, rad, osmTypes);
      lastFetchedPos.current = pos;
      const elements = json.elements || [];
      const mapped = elements.map(el => {
        const elLat = el.lat ?? el.center?.lat;
        const elLon = el.lon ?? el.center?.lon;
        const typeInfo = osmTypes.find(t => el.tags?.[t.osmKey] === t.osmVal);
        return {
          id: el.id,
          name: el.tags?.name || el.tags?.['name:en'] || typeInfo?.label || 'Unknown',
          lat: elLat, lon: elLon,
          type: typeInfo,
          phone: el.tags?.phone || el.tags?.['contact:phone'],
          addr: el.tags?.['addr:full'] || [el.tags?.['addr:street'], el.tags?.['addr:city']].filter(Boolean).join(', '),
          dist: elLat && elLon
            ? Math.round(Math.hypot((elLat - lat) * 111320, (elLon - lon) * 111320 * Math.cos(lat * Math.PI / 180)))
            : null,
        };
      }).filter(p => p.lat && p.lon).sort((a, b) => (a.dist || 9999) - (b.dist || 9999));
      setPlaces(mapped.slice(0, 50));
    } catch {
      setPlaces([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { getLocation(); }, [getLocation]);

  // Re-fetch only when position, radius, or selected types change
  useEffect(() => {
    if (position) fetchNearby(position, radius, selectedTypes);
  }, [position, radius, selectedTypes, fetchNearby]);

  const card = { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '16px', boxShadow: 'var(--shadow-sm)' };
  const userIcon = L.divIcon({ html: '<div style="width:14px;height:14px;background:#e53e3e;border:3px solid #fff;border-radius:50%;box-shadow:0 0 0 4px rgba(229,62,62,0.3)"></div>', className: '', iconSize: [14, 14], iconAnchor: [7, 7] });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '88px 24px 60px', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg,#145c33,#27ae60)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(39,174,96,0.3)' }}>
            <MapPin size={24} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Nearby Safe Places</h1>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '2px 0 0' }}>Hospitals, shelters, police &amp; rescue stations near you</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <select value={radius} onChange={e => { lastFetchedPos.current = null; setRadius(Number(e.target.value)); }}
            style={{ padding: '8px 12px', background: 'var(--bg-surface-2)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}>
            <option value={1000}>1 km</option>
            <option value={3000}>3 km</option>
            <option value={5000}>5 km</option>
            <option value={10000}>10 km</option>
          </select>
          <button onClick={() => { lastFetchedPos.current = null; getLocation(); }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 14px', background: 'var(--bg-surface-2)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px' }}>
            <Navigation size={14} /> Locate Me
          </button>
        </div>
      </div>

      {locationError && (
        <div style={{ padding: '12px 16px', background: 'rgba(214,158,46,0.08)', border: '1px solid rgba(214,158,46,0.3)', borderRadius: '12px', color: '#d69e2e', fontSize: '13px', marginBottom: '16px' }}>
          ⚠ {locationError}
        </div>
      )}

      {/* Type filters */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {SAFE_PLACE_TYPES.map(t => (
          <button key={t.key}
            onClick={() => { lastFetchedPos.current = null; setSelectedTypes(p => p.includes(t.key) ? p.filter(x => x !== t.key) : [...p, t.key]); }}
            style={{ padding: '7px 14px', borderRadius: '10px', border: `1.5px solid ${selectedTypes.includes(t.key) ? t.color : 'var(--border)'}`, background: selectedTypes.includes(t.key) ? `${t.color}18` : 'transparent', color: selectedTypes.includes(t.key) ? t.color : 'var(--text-secondary)', cursor: 'pointer', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '20px' }}>
        {/* Map */}
        <div style={{ ...card, overflow: 'hidden' }}>
          {position ? (
            <MapContainer center={position} zoom={14} style={{ height: '500px', width: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={position} icon={userIcon}><Popup>📍 You are here</Popup></Marker>
              <Circle center={position} radius={radius} pathOptions={{ color: '#e53e3e', fillColor: '#e53e3e', fillOpacity: 0.05, weight: 1, dashArray: '6' }} />
              {places.map(p => {
                const tc = p.type?.color || '#38a169';
                return (
                  <Marker key={p.id} position={[p.lat, p.lon]} icon={makeIcon(p.type?.emoji || '📍', tc)}>
                    <Popup>
                      <strong>{p.name}</strong><br />
                      {p.type?.label}<br />
                      {p.dist ? `📍 ~${p.dist < 1000 ? `${p.dist}m` : `${(p.dist / 1000).toFixed(1)}km`} away` : ''}<br />
                      {p.addr && <span>🏠 {p.addr}<br /></span>}
                      {p.phone && <a href={`tel:${p.phone}`}>📞 {p.phone}</a>}
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          ) : (
            <div style={{ height: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-surface-2)', gap: '10px', color: 'var(--text-muted)', fontSize: '14px' }}>
              <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} /> Getting your location...
            </div>
          )}
        </div>

        {/* List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '520px', overflowY: 'auto' }}>
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '30px', color: 'var(--text-muted)', fontSize: '13px' }}>
              <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Finding nearby places...
            </div>
          )}
          {!loading && places.length === 0 && (
            <div style={{ ...card, padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              No places found nearby. Try increasing the radius or enabling more types.
            </div>
          )}
          {places.map((p, i) => {
            const tc = p.type?.color || '#38a169';
            const distLabel = p.dist ? (p.dist < 1000 ? `${p.dist}m` : `${(p.dist / 1000).toFixed(1)}km`) : '';
            return (
              <div key={i} style={{ ...card, padding: '14px 16px', borderLeft: `4px solid ${tc}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span>{p.type?.emoji || '📍'}</span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{p.name}</span>
                    </div>
                    {p.addr && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>📍 {p.addr}</div>}
                    {p.phone && <a href={`tel:${p.phone}`} style={{ fontSize: '12px', color: 'var(--accent)', textDecoration: 'none', display: 'block', marginTop: '3px' }}>📞 {p.phone}</a>}
                  </div>
                  {distLabel && <span style={{ fontSize: '12px', fontWeight: 700, color: tc, background: `${tc}18`, padding: '3px 8px', borderRadius: '6px', whiteSpace: 'nowrap' }}>~{distLabel}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
