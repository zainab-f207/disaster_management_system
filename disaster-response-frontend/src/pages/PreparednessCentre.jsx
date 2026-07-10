import { useState } from 'react';

const GUIDES = [
  {
    type: 'Earthquake',
    emoji: '🌍',
    color: '#dd6b20',
    before: [
      'Secure heavy furniture to walls',
      'Keep emergency kit ready (water, food, first aid)',
      'Identify safe spots — under sturdy tables, against inner walls',
      'Know how to turn off gas, water, electricity',
      'Practice Drop, Cover, Hold On with family',
    ],
    during: [
      '🔽 DROP to hands and knees',
      '🛡️ COVER your head and neck under a table or against inner wall',
      '✋ HOLD ON until shaking stops',
      '❌ Do NOT run outside during shaking',
      '❌ Do NOT use elevators',
      '✅ If in a car, pull over away from buildings',
    ],
    after: [
      'Check yourself and others for injuries',
      'Expect aftershocks — move away from damaged buildings',
      'Do NOT use gas appliances — check for gas leaks first',
      'Listen to official radio: Radio Pakistan 630 AM',
      'Call NDMA if trapped: 1135',
    ],
    callNow: '1122',
  },
  {
    type: 'Flood',
    emoji: '🌊',
    color: '#4299e1',
    before: [
      'Move to higher ground if flood warning issued',
      'Store important documents in waterproof bag',
      'Prepare emergency kit with 3 days of supplies',
      'Disconnect electrical appliances',
      'Fill bathtubs with clean water for later use',
    ],
    during: [
      '🏃 Evacuate immediately if told to',
      '❌ Never walk through moving water (15cm can knock you down)',
      '❌ Never drive through flooded road',
      '📻 Stay tuned to Pakistan Meteorological Department',
      '🏠 Move to highest floor — do not go to basement',
      '☎️ Call 1129 (PDMA) for evacuation assistance',
    ],
    after: [
      'Do not enter floodwater — may be contaminated',
      'Check structural damage before re-entering home',
      'Boil all water before drinking',
      'Photograph all damage for insurance',
      'Beware of snakes and insects displaced by flood',
    ],
    callNow: '1129',
  },
  {
    type: 'Heatwave',
    emoji: '🌡️',
    color: '#e53e3e',
    before: [
      'Stock up on water and electrolyte drinks',
      'Identify cooling centres in your area (mosques, community halls)',
      'Check on elderly neighbors and family',
      'Prepare fans, wet towels, cooling packs',
    ],
    during: [
      '🏠 Stay indoors between 10AM and 4PM',
      '💧 Drink water every 30 minutes — even if not thirsty',
      '👕 Wear light, loose, light-colored clothing',
      '❌ Avoid strenuous activity outdoors',
      '🧴 Apply sunscreen if going outside',
      '🚗 Never leave children in parked cars',
    ],
    after: [
      'Check on vulnerable people — elderly, children, ill',
      'If someone collapses from heat — move to shade, cool with water, call 1122',
      'Heat stroke signs: no sweating, confusion, fever — emergency!',
    ],
    callNow: '1122',
  },
  {
    type: 'Fire',
    emoji: '🔥',
    color: '#e53e3e',
    before: [
      'Install smoke detectors on every floor',
      'Keep fire extinguisher accessible',
      'Plan two escape routes from every room',
      'Practice family fire drill',
      'Never leave cooking unattended',
    ],
    during: [
      '🏃 Get out immediately — do not waste time collecting belongings',
      '🚪 Feel doors before opening — if hot, use another exit',
      '🧎 Stay low — smoke rises, cleaner air is near the floor',
      '📵 Do NOT use elevators',
      '🚪 Close doors behind you to slow fire spread',
      '☎️ Call 16 (Fire Brigade) once outside',
    ],
    after: [
      'Do NOT re-enter building for any reason',
      'Seek medical attention for burns or smoke inhalation',
      'Contact NADRA for document replacement if needed',
    ],
    callNow: '16',
  },
  {
    type: 'Gas Explosion / Leak',
    emoji: '💥',
    color: '#d69e2e',
    before: [
      'Know location of gas shut-off valve',
      'Never store flammable materials near gas appliances',
      'Have gas lines inspected annually',
    ],
    during: [
      '❌ Do NOT turn on/off any light switches',
      '❌ Do NOT use phone or create any spark inside',
      '🚪 Open windows and doors as you leave',
      '🏃 Evacuate immediately and warn neighbors',
      '🔴 Turn off gas at meter if safe to do so',
      '☎️ Call SNGPL 1199 or 1122 from outside',
    ],
    after: [
      'Do not re-enter until cleared by gas company',
      'Do not light any flame near the area',
      'Report to SNGPL (Lahore/North): 1199',
      'Report to SSGC (Karachi/South): 1199',
    ],
    callNow: '1122',
  },
  {
    type: 'Road Accident',
    emoji: '🚗',
    color: '#9f7aea',
    before: [
      'Keep first aid kit in vehicle',
      'Save emergency numbers in phone: 1122, 115',
      'Always wear seatbelt',
    ],
    during: [
      '☎️ Call 1122 (Rescue) immediately',
      '🚧 Place warning triangles/lights if possible',
      '❌ Do NOT move injured person unless in immediate danger',
      '🩹 Apply pressure to bleeding wounds',
      '✅ Keep injured person warm and calm',
    ],
    after: [
      'Give details of exact location to 1122',
      'Note down vehicle numbers if hit-and-run',
      'Call Police 15 if needed for FIR',
    ],
    callNow: '1122',
  },
];

export default function PreparednessCentre() {
  const [selected, setSelected] = useState(null);
  const [activeSection, setActiveSection] = useState('during');

  const guide = GUIDES.find(g => g.type === selected);

  return (
    <div style={{
      maxWidth: '960px', margin: '0 auto',
      padding: '88px 24px 60px', minHeight: '100vh',
    }}>
      <div style={{ marginBottom: '28px', animation: 'fadeInUp 0.4s ease' }}>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: '26px',
          fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px',
        }}>
          🛡️ Disaster Preparedness Centre
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
          Know what to do before, during, and after every type of emergency in Pakistan
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: '10px', marginBottom: '28px',
      }}>
        {GUIDES.map((g, i) => (
          <button
            key={g.type}
            onClick={() => { setSelected(g.type); setActiveSection('during'); }}
            style={{
              padding: '16px 12px',
              background: selected === g.type ? `${g.color}15` : 'var(--card-bg)',
              border: `2px solid ${selected === g.type ? g.color : 'var(--border)'}`,
              borderRadius: '14px', cursor: 'pointer',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: '8px',
              transition: 'all 0.15s',
              animation: `fadeInUp 0.3s ease ${i*30}ms both`,
            }}
            onMouseEnter={e => {
              if (selected !== g.type) {
                e.currentTarget.style.borderColor = g.color;
                e.currentTarget.style.background = `${g.color}08`;
              }
            }}
            onMouseLeave={e => {
              if (selected !== g.type) {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.background = 'var(--card-bg)';
              }
            }}
          >
            <span style={{ fontSize: '32px' }}>{g.emoji}</span>
            <span style={{
              fontSize: '12px', fontWeight: 700,
              color: selected === g.type ? g.color : 'var(--text-primary)',
              textAlign: 'center', lineHeight: 1.3,
            }}>
              {g.type}
            </span>
          </button>
        ))}
      </div>

      {guide && (
        <div style={{ animation: 'scaleIn 0.25s ease' }}>
          <div style={{
            background: 'var(--card-bg)',
            border: `1px solid var(--border)`,
            borderTop: `4px solid ${guide.color}`,
            borderRadius: 'var(--radius-xl)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-md)',
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              flexWrap: 'wrap', gap: '12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '36px' }}>{guide.emoji}</span>
                <div>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {guide.type} Guide
                  </h2>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Before, during, and after response guide
                  </p>
                </div>
              </div>
              <a href={`tel:${guide.callNow}`} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 18px',
                background: guide.color,
                color: '#fff', borderRadius: '12px',
                textDecoration: 'none', fontSize: '14px', fontWeight: 800,
                boxShadow: `0 4px 12px ${guide.color}40`,
              }}>
                ☎️ Call {guide.callNow}
              </a>
            </div>

            <div style={{
              display: 'flex', borderBottom: '1px solid var(--border)',
            }}>
              {[
                { key: 'before', label: '📋 Before', desc: 'Preparation' },
                { key: 'during', label: '⚡ During', desc: 'Immediate action' },
                { key: 'after',  label: '🔄 After',  desc: 'Recovery' },
              ].map(s => (
                <button
                  key={s.key}
                  onClick={() => setActiveSection(s.key)}
                  style={{
                    flex: 1, padding: '12px 8px',
                    background: 'transparent', border: 'none',
                    borderBottom: `2px solid ${activeSection === s.key ? guide.color : 'transparent'}`,
                    cursor: 'pointer', transition: 'all 0.15s',
                    color: activeSection === s.key ? guide.color : 'var(--text-muted)',
                    fontWeight: activeSection === s.key ? 700 : 500,
                    fontSize: '13px',
                  }}
                >
                  {s.label}
                  <div style={{ fontSize: '10px', marginTop: '2px', opacity: 0.7 }}>
                    {s.desc}
                  </div>
                </button>
              ))}
            </div>

            <div style={{ padding: '20px 24px' }}>
              {guide[activeSection].map((step, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex', gap: '12px',
                    padding: '12px 14px', marginBottom: '8px',
                    background: 'var(--bg-surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    animation: `fadeInUp 0.25s ease ${i*40}ms both`,
                  }}
                >
                  <div style={{
                    width: '24px', height: '24px', flexShrink: 0,
                    borderRadius: '50%', background: `${guide.color}20`,
                    border: `2px solid ${guide.color}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '11px', fontWeight: 800, color: guide.color,
                  }}>
                    {i + 1}
                  </div>
                  <p style={{
                    fontSize: '14px', color: 'var(--text-secondary)',
                    margin: 0, lineHeight: 1.5,
                  }}>
                    {step}
                  </p>
                </div>
              ))}

              <div style={{
                marginTop: '16px', padding: '14px 16px',
                background: `${guide.color}08`,
                border: `1px solid ${guide.color}30`,
                borderRadius: '12px',
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', flexWrap: 'wrap', gap: '10px',
              }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: guide.color }}>
                    ☎️ Emergency Numbers for {guide.type}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>
                    Rescue 1122 · Edhi 115 · Police 15 · NDMA 1135
                  </div>
                </div>
                <a href={`tel:${guide.callNow}`} style={{
                  padding: '8px 18px',
                  background: guide.color, color: '#fff',
                  borderRadius: '10px', textDecoration: 'none',
                  fontSize: '14px', fontWeight: 800,
                }}>
                  Call {guide.callNow} Now
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {!selected && (
        <div style={{
          textAlign: 'center', padding: '48px',
          background: 'var(--card-bg)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
        }}>
          <div style={{ fontSize: '56px', marginBottom: '12px' }}>☝️</div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', color: 'var(--text-primary)', marginBottom: '6px' }}>
            Select a disaster type above
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Get step-by-step before, during, and after guidance
          </p>
        </div>
      )}
    </div>
  );
}