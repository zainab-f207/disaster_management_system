import { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation, Map, X } from 'lucide-react';

function DraggablePin({ position, onMove }) {
  const icon = L.divIcon({
    html: `<div style="
      width:32px;height:40px;display:flex;
      flex-direction:column;align-items:center;
    ">
      <div style="
        width:20px;height:20px;border-radius:50%;
        background:#e53e3e;border:3px solid #fff;
        box-shadow:0 2px 8px rgba(229,62,62,0.5);
      "></div>
      <div style="
        width:2px;height:16px;background:#e53e3e;
      "></div>
    </div>`,
    className: '',
    iconSize:   [32,40],
    iconAnchor: [16,40],
  });

  return (
    <Marker
      position={position}
      icon={icon}
      draggable={true}
      eventHandlers={{
        dragend: (e) => {
          const latlng = e.target.getLatLng();
          onMove(latlng.lat, latlng.lng);
        }
      }}
    />
  );
}

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click: (e) => onMapClick(e.latlng.lat, e.latlng.lng),
  });
  return null;
}

export default function LocationPicker({ onLocationSelect, error }) {
  const [query, setQuery]           = useState('');
  const [results, setResults]       = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingGPS, setLoadingGPS] = useState(false);
  const [selected, setSelected]     = useState(null);
  const [showDrop, setShowDrop]     = useState(false);
  const [showMap, setShowMap]       = useState(false);
  const [mapCenter, setMapCenter]   = useState([30.3753, 69.3451]); // Pakistan center
  const timerRef                    = useRef(null);

  useEffect(() => {
    if (query.length < 3) { setResults([]); return; }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => searchLocation(query), 600);
    return () => clearTimeout(timerRef.current);
  }, [query]);

  const searchLocation = async (q) => {
    setLoadingSearch(true);
    try {
      const searchQ = q.toLowerCase().includes('pakistan') ? q : `${q}, Pakistan`;
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search` +
        `?q=${encodeURIComponent(searchQ)}` +
        `&format=json&addressdetails=1&limit=5&countrycodes=pk&accept-language=en`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      const cleaned = data.map(item => {
        const a = item.address || {};
        const parts = [
          a.neighbourhood || a.suburb || a.quarter || a.road,
          a.city || a.town || a.village,
          a.state,
        ].filter(Boolean);
        return {
          label:       parts.slice(0,2).join(', '),
          fullLabel:   parts.join(', '),
          city:        a.city || a.town || a.village || '',
          province:    a.state || '',
          latitude:    parseFloat(item.lat),
          longitude:   parseFloat(item.lon),
          displayName: parts.slice(0,3).join(', ') + ', Pakistan',
        };
      }).filter((v,i,arr) => arr.findIndex(x => x.label === v.label) === i);
      setResults(cleaned);
      setShowDrop(cleaned.length > 0);
    } catch {}
    finally { setLoadingSearch(false); }
  };

  const reverseGeocode = async (lat, lon) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse` +
        `?lat=${lat}&lon=${lon}&format=json&accept-language=en`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      const a = data.address || {};
      const parts = [
        a.neighbourhood || a.suburb || a.quarter || a.road,
        a.city || a.town || a.village,
        a.state,
      ].filter(Boolean);
      return {
        label:       parts.slice(0,2).join(', ') || 'Selected Location',
        displayName: parts.slice(0,3).join(', ') + ', Pakistan',
        city:        a.city || a.town || a.village || '',
        province:    a.state || '',
      };
    } catch {
      return { label: `${lat.toFixed(4)}, ${lon.toFixed(4)}`, displayName: '', city: '', province: '' };
    }
  };

  const confirmLocation = async (lat, lon, nameInfo = null) => {
    const info = nameInfo || await reverseGeocode(lat, lon);
    const place = { label: info.label, displayName: info.displayName, city: info.city, province: info.province, latitude: lat, longitude: lon };
    setSelected(place);
    setQuery(place.label);
    setShowDrop(false);
    setShowMap(false);
    onLocationSelect({ latitude: lat, longitude: lon, locationName: place.displayName });
  };

  const handlePickResult = (place) => {
    setSelected(place);
    setQuery(place.label);
    setShowDrop(false);
    setMapCenter([place.latitude, place.longitude]);
    onLocationSelect({ latitude: place.latitude, longitude: place.longitude, locationName: place.displayName });
  };

  const handleGetGPS = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setLoadingGPS(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setMapCenter([latitude, longitude]);
        await confirmLocation(latitude, longitude);
        setLoadingGPS(false);
      },
      (err) => {
        alert('Could not get your location. Please search manually.');
        setLoadingGPS(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleMapMove = async (lat, lon) => {
    setMapCenter([lat, lon]);
    const info = await reverseGeocode(lat, lon);
    setSelected({
      label:       info.label,
      displayName: info.displayName,
      city:        info.city,
      province:    info.province,
      latitude:    lat,
      longitude:   lon,
    });
    setQuery(info.label);
    onLocationSelect({ latitude: lat, longitude: lon, locationName: info.displayName });
  };

  const handleClear = () => {
    setSelected(null);
    setQuery('');
    setResults([]);
    setShowDrop(false);
    onLocationSelect({ latitude: null, longitude: null, locationName: '' });
  };

  return (
    <div style={{ marginBottom: '18px' }}>
      <label style={{
        display: 'block', fontSize: '13px', fontWeight: 600,
        color: 'var(--text-secondary)', marginBottom: '8px',
      }}>
        📍 Location <span style={{ color: '#e53e3e' }}>*</span>
      </label>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
        {/* Search input */}
        <div style={{ position: 'relative', flex: 1 }}>
          <span style={{
            position: 'absolute', left: '12px', top: '50%',
            transform: 'translateY(-50%)', pointerEvents: 'none',
            fontSize: '14px',
          }}>
            {loadingSearch ? '⏳' : '🔍'}
          </span>
          <input
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(null); }}
            placeholder="Search area, street, or city in Pakistan..."
            style={{
              width: '100%', padding: '10px 36px 10px 36px',
              background: 'var(--bg-surface-2)',
              border: `1.5px solid ${error ? '#e53e3e' : selected ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: '10px', color: 'var(--text-primary)',
              fontSize: '13px', outline: 'none', boxSizing: 'border-box',
              transition: 'border-color 0.2s',
            }}
            onFocus={e => {
              e.target.style.borderColor = 'var(--accent)';
              if (results.length > 0) setShowDrop(true);
            }}
            onBlur={e => {
              e.target.style.borderColor = selected ? 'var(--accent)' : 'var(--border)';
              setTimeout(() => setShowDrop(false), 180);
            }}
          />
          {(query || selected) && (
            <button
              type="button"
              onClick={handleClear}
              style={{
                position: 'absolute', right: '10px', top: '50%',
                transform: 'translateY(-50%)',
                background: 'none', border: 'none',
                cursor: 'pointer', color: 'var(--text-muted)',
                display: 'flex', alignItems: 'center',
              }}
            >
              <X size={13} />
            </button>
          )}

          {showDrop && results.length > 0 && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 4px)',
              left: 0, right: 0, zIndex: 999,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              boxShadow: 'var(--shadow-lg)',
              overflow: 'hidden',
            }}>
              {results.map((place, i) => (
                <div
                  key={i}
                  onMouseDown={() => handlePickResult(place)}
                  style={{
                    padding: '10px 14px', cursor: 'pointer',
                    borderBottom: i < results.length - 1 ? '1px solid var(--border)' : 'none',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-subtle)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>
                    📍 {place.label}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {place.province}, Pakistan
                    </span>
                    <span style={{
                      fontSize: '10px', padding: '1px 7px',
                      background: 'var(--accent-subtle)',
                      color: 'var(--accent)', borderRadius: '8px', fontWeight: 600,
                    }}>
                      {place.city}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleGetGPS}
          disabled={loadingGPS}
          title="Use my current location"
          style={{
            padding: '10px 14px',
            background: loadingGPS ? 'var(--border)' : 'rgba(39,174,96,0.1)',
            border: '1.5px solid rgba(39,174,96,0.4)',
            borderRadius: '10px', cursor: loadingGPS ? 'not-allowed' : 'pointer',
            color: 'var(--accent)', display: 'flex', alignItems: 'center',
            gap: '6px', fontSize: '12px', fontWeight: 700,
            whiteSpace: 'nowrap', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { if (!loadingGPS) e.currentTarget.style.background = 'rgba(39,174,96,0.2)'; }}
          onMouseLeave={e => { if (!loadingGPS) e.currentTarget.style.background = 'rgba(39,174,96,0.1)'; }}
        >
          <Navigation size={14} style={{ animation: loadingGPS ? 'spin-slow 1s linear infinite' : 'none' }} />
          {loadingGPS ? 'Getting...' : 'My Location'}
        </button>

        <button
          type="button"
          onClick={() => setShowMap(!showMap)}
          title="Pick location on map"
          style={{
            padding: '10px 14px',
            background: showMap ? 'var(--accent-subtle)' : 'var(--bg-surface-2)',
            border: `1.5px solid ${showMap ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: '10px', cursor: 'pointer',
            color: showMap ? 'var(--accent)' : 'var(--text-muted)',
            display: 'flex', alignItems: 'center', gap: '6px',
            fontSize: '12px', fontWeight: 700, transition: 'all 0.15s',
          }}
        >
          <Map size={14} />
          {showMap ? 'Hide Map' : 'Pin on Map'}
        </button>
      </div>

      {selected && (
        <div style={{
          marginBottom: '8px', padding: '8px 12px',
          background: 'rgba(39,174,96,0.08)',
          border: '1px solid rgba(39,174,96,0.25)',
          borderRadius: '8px', fontSize: '12px',
          color: 'var(--accent)', display: 'flex',
          alignItems: 'center', gap: '6px',
        }}>
          <MapPin size={12} />
          <strong>{selected.label}</strong>
          {selected.province && `, ${selected.province}`}
          <span style={{ color: 'var(--text-muted)', marginLeft: '4px' }}>
            ({selected.latitude?.toFixed(4)}, {selected.longitude?.toFixed(4)})
          </span>
        </div>
      )}

      {showMap && (
        <div style={{
          borderRadius: '12px', overflow: 'hidden',
          border: '1px solid var(--border)',
          marginBottom: '8px',
          animation: 'scaleIn 0.2s ease',
        }}>
          <div style={{
            padding: '8px 12px',
            background: 'var(--bg-surface-2)',
            borderBottom: '1px solid var(--border)',
            fontSize: '12px', color: 'var(--text-muted)',
          }}>
            🗺️ Click on map or drag the pin to set location
          </div>
          <div style={{ height: '300px' }}>
            <MapContainer
              center={mapCenter}
              zoom={selected ? 14 : 6}
              style={{ height: '100%', width: '100%' }}
              key={`${mapCenter[0]}-${mapCenter[1]}`} // re-center when GPS used
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <MapClickHandler onMapClick={handleMapMove} />
              {selected && (
                <DraggablePin
                  position={[selected.latitude, selected.longitude]}
                  onMove={handleMapMove}
                />
              )}
            </MapContainer>
          </div>
        </div>
      )}

      {error && (
        <p style={{ color: '#e53e3e', fontSize: '12px', marginTop: '4px' }}>⚠ {error}</p>
      )}
      {!selected && (
        <p style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '4px' }}>
          💡 Search by area name, or tap "My Location" for GPS, or "Pin on Map" to drop a marker
        </p>
      )}
    </div>
  );
}