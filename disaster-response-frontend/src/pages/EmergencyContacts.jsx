import { useState } from 'react';
import { Phone, MapPin, Heart, Shield, Flame, Zap, Droplet, AlertTriangle } from 'lucide-react';

const CONTACTS = [
  { name: 'Rescue 1122', number: '1122', emoji: '🚒', color: '#e53e3e', desc: 'Fire, Rescue & Medical Emergency', category: 'Emergency' },
  { name: 'Police Emergency', number: '15', emoji: '👮', color: '#3182ce', desc: 'Law enforcement & security', category: 'Emergency' },
  { name: 'Edhi Foundation', number: '115', emoji: '🚑', color: '#e53e3e', desc: 'Ambulance & welfare services', category: 'Emergency' },
  { name: 'NDMA', number: '1135', emoji: '🛡️', color: '#38a169', desc: 'National disaster management', category: 'Emergency' },
  { name: 'Rescue 1122 (KPK)', number: '1122', emoji: '🚒', color: '#dd6b20', desc: 'Khyber Pakhtunkhwa rescue', category: 'Emergency' },
  { name: 'Chhipa Welfare', number: '1020', emoji: '🏥', color: '#805ad5', desc: 'Ambulance & disaster relief', category: 'Emergency' },
  { name: 'SSGC Gas Emergency', number: '1199', emoji: '💨', color: '#d69e2e', desc: 'Gas leaks & gas emergencies (Sindh & Balochistan)', category: 'Utility' },
  { name: 'SNGPL Gas Emergency', number: '1202', emoji: '💨', color: '#d69e2e', desc: 'Gas leaks & emergencies (Punjab & KPK)', category: 'Utility' },
  { name: 'WAPDA / Electricity', number: '118', emoji: '⚡', color: '#d69e2e', desc: 'Electricity emergencies & power lines', category: 'Utility' },
  { name: 'KWSB Water (Karachi)', number: '99901', emoji: '💧', color: '#3182ce', desc: 'Water supply emergencies', category: 'Utility' },
  { name: 'Fire Brigade', number: '16', emoji: '🔥', color: '#e53e3e', desc: 'Fire department', category: 'Emergency' },
  { name: 'Aman Foundation', number: '115', emoji: '🏥', color: '#38a169', desc: 'Emergency medical & trauma care', category: 'Emergency' },
  { name: 'Red Crescent (PRCS)', number: '042-35761999', emoji: '🏥', color: '#e53e3e', desc: 'Disaster relief & humanitarian aid', category: 'NGO' },
  { name: 'Alkhidmat Foundation', number: '0800-00786', emoji: '🤝', color: '#38a169', desc: 'Relief services', category: 'NGO' },
  { name: 'Deaf & Dumb SMS SOS', number: '1169', emoji: '📱', color: '#805ad5', desc: 'SMS emergency for differently-abled', category: 'Accessibility' },
];

const CATEGORIES = ['All', 'Emergency', 'Utility', 'NGO', 'Accessibility'];

export default function EmergencyContacts() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');

  const filtered = CONTACTS.filter(c => {
    const matchCat = activeCategory === 'All' || c.category === activeCategory;
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.number.includes(search) || c.desc.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const card = { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '16px', boxShadow: 'var(--shadow-sm)' };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '88px 24px 60px', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ ...card, padding: '24px', marginBottom: '24px', background: 'linear-gradient(135deg, rgba(229,62,62,0.07), rgba(197,48,48,0.03))', borderTop: '4px solid #e53e3e', animation: 'fadeInUp 0.4s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '52px', height: '52px', background: 'linear-gradient(135deg,#9b2335,#e53e3e)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(229,62,62,0.35)' }}>
            <Phone size={26} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Emergency Contacts</h1>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0' }}>Pakistan emergency helplines — one-tap calling</p>
          </div>
        </div>
      </div>

      {/* SOS banner */}
      <div style={{ ...card, padding: '16px 20px', marginBottom: '20px', background: 'rgba(229,62,62,0.06)', border: '1px solid rgba(229,62,62,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 600 }}>
          🚨 In a life-threatening emergency — call <strong style={{ color: '#e53e3e', fontSize: '18px' }}>1122</strong> immediately
        </div>
        <a href="tel:1122" style={{ padding: '10px 20px', background: 'linear-gradient(135deg,#9b2335,#e53e3e)', borderRadius: '10px', color: '#fff', textDecoration: 'none', fontWeight: 800, fontSize: '15px', boxShadow: '0 4px 12px rgba(229,62,62,0.4)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          📞 Call 1122 Now
        </a>
      </div>

      {/* Filters & Search */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)} style={{ padding: '7px 14px', borderRadius: '10px', border: `1.5px solid ${activeCategory === cat ? 'var(--accent)' : 'var(--border)'}`, background: activeCategory === cat ? 'var(--accent-subtle)' : 'transparent', color: activeCategory === cat ? 'var(--accent)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
            {cat}
          </button>
        ))}
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search contacts..." style={{ marginLeft: 'auto', padding: '8px 14px', background: 'var(--bg-surface-2)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', minWidth: '200px' }} />
      </div>

      {/* Contact Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: '14px' }}>
        {filtered.map((c, i) => (
          <div key={i} style={{ ...card, padding: '18px', borderLeft: `5px solid ${c.color}`, display: 'flex', flexDirection: 'column', gap: '10px', transition: 'transform 0.15s', cursor: 'default' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: `${c.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>
                {c.emoji}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>{c.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{c.desc}</div>
              </div>
            </div>
            <a href={`tel:${c.number}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', background: `${c.color}15`, border: `2px solid ${c.color}40`, borderRadius: '10px', color: c.color, textDecoration: 'none', fontWeight: 800, fontSize: '18px', fontFamily: 'var(--font-display)', letterSpacing: '0.02em', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = c.color; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = `${c.color}15`; e.currentTarget.style.color = c.color; }}>
              📞 {c.number}
            </a>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ ...card, padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          No contacts match your search.
        </div>
      )}

      <div style={{ marginTop: '24px', padding: '16px', background: 'var(--bg-surface-2)', borderRadius: '12px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
        ℹ️ All numbers shown are official Pakistan emergency helplines. Numbers may vary by province or city. Always verify with your local authority in case of discrepancy.
      </div>
    </div>
  );
}
