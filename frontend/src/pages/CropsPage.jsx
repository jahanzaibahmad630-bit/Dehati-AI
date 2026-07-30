import { useState, useEffect } from 'react';
import { askAI } from '../services/api';
import AIDisclaimer from '../components/ui/AIDisclaimer';
import MarkdownRenderer from '../components/MarkdownRenderer';
import AudioPlayer from '../components/ui/AudioPlayer';

import { useOffline } from '../hooks/useOffline';

// ─── Default crops shown on first load ─────────────────────────────────────────
const DEFAULT_CROPS = [
  {
    id: 'wheat-default', icon: '🌾', name: 'گندم', field: 'کھیت نمبر ۱', area: '5',
    health: 82, status: 'اچھی حالت', nextAction: 'اگلا پانی: 3 دن بعد',
    variety: 'اوقاس 2000', soilMoisture: 68, planted: 'نومبر 2025', harvest: 'اپریل 2026'
  },
  {
    id: 'cotton-default', icon: '🪻', name: 'کپاس', field: 'کھیت نمبر ۲', area: '3',
    health: 61, status: 'توجہ درکار', nextAction: 'سپرے کریں: کل',
    variety: 'NIAB-878', soilMoisture: 45, planted: 'مئی 2026', harvest: 'نومبر 2026'
  },
];

const COMMON_CROPS = [
  { name: 'گندم',    icon: '🌾' }, { name: 'کپاس',   icon: '🪻' },
  { name: 'چاول',   icon: '🍚' }, { name: 'مکئی',   icon: '🌽' },
  { name: 'گنا',    icon: '🌿' }, { name: 'آلو',    icon: '🥔' },
  { name: 'پیاز',   icon: '🧅' }, { name: 'ٹماٹر',  icon: '🍅' },
  { name: 'مرچ',    icon: '🌶️' }, { name: 'سرسوں',  icon: '🌼' },
  { name: 'چنا',    icon: '🫘' }, { name: 'مسور',   icon: '🫘' },
  { name: 'مونگ',   icon: '🫘' }, { name: 'تربوز',  icon: '🍉' },
  { name: 'کھیرا',  icon: '🥒' }, { name: 'بینگن',  icon: '🍆' },
];

const MONTH_OPTIONS = [
  'جنوری','فروری','مارچ','اپریل','مئی','جون',
  'جولائی','اگست','ستمبر','اکتوبر','نومبر','دسمبر'
];
const YEAR_OPTIONS = ['2024','2025','2026','2027'];

const DEFAULT_TASKS = [
  { id: 1, label: 'گندم کو پانی دیں',           date: 'آج',         done: false, icon: '💧' },
  { id: 2, label: 'کپاس پر سپرے کریں',          date: 'کل',         done: false, icon: '🌿' },
  { id: 3, label: 'منڈی میں گندم کی قیمت چیک کریں', date: 'جمعہ',   done: false, icon: '📈' },
  { id: 4, label: 'DAP کھاد خریدیں',            date: 'ہفتے',       done: false, icon: '🌱' },
  { id: 5, label: 'زرعی افسر سے ملیں',          date: 'اگلا ہفتہ',  done: false, icon: '👨‍🌾' },
];

function loadCrops() {
  try { return JSON.parse(localStorage.getItem('dehati_crops') || 'null') || DEFAULT_CROPS; }
  catch { return DEFAULT_CROPS; }
}
function saveCrops(crops) { localStorage.setItem('dehati_crops', JSON.stringify(crops)); }

function loadTasks() {
  try { return JSON.parse(localStorage.getItem('dehati_tasks') || 'null') || DEFAULT_TASKS; }
  catch { return DEFAULT_TASKS; }
}

// ─── Moisture ring ──────────────────────────────────────────────────────────────
function MoistureRing({ pct = 65, size = 90 }) {
  const r = (size - 14) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const cx = size / 2, cy = size / 2;
  const color = pct >= 60 ? '#2e5a27' : pct >= 35 ? '#fbc02d' : '#dc2626';
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e8f5e3" strokeWidth="10" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="10"
        strokeLinecap="round" strokeDasharray={`${dash} ${circ}`}
        style={{ transition: 'stroke-dasharray 1.2s ease' }} />
    </svg>
  );
}

// ─── Crop card ──────────────────────────────────────────────────────────────────
function CropCard({ crop, onDelete, onEdit }) {
  const isWarning = crop.health < 70;
  const badgeStyle = {
    display: 'inline-flex', alignItems: 'center', padding: '.18rem .55rem',
    borderRadius: 'var(--radius-full)', fontSize: '.72rem', fontWeight: 800,
    background: isWarning ? 'var(--gold-100)' : 'var(--green-100)',
    color: isWarning ? 'var(--gold-700)' : 'var(--green-700)',
    border: `1px solid ${isWarning ? 'rgba(251,192,45,.4)' : 'var(--green-200)'}`,
  };

  return (
    <div className="crop-card animate-fade-in-up">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
          <span style={{ fontSize: '1.8rem', width: 44, height: 44, borderRadius: 12,
            background: 'var(--green-100)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {crop.icon}
          </span>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem' }}>{crop.name}</div>
            <div style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>{crop.variety} • {crop.area} ایکڑ</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '.35rem' }}>
          <div style={badgeStyle}>{isWarning ? '⚠️' : '✅'} {crop.status}</div>
          <div style={{ display: 'flex', gap: '.3rem' }}>
            <button onClick={() => onEdit(crop)} style={{
              background: 'var(--green-100)', border: 'none', borderRadius: 6,
              padding: '.15rem .45rem', fontSize: '.7rem', cursor: 'pointer', color: 'var(--green-700)', fontWeight: 700
            }}>✏️ ترمیم</button>
            <button onClick={() => onDelete(crop.id)} style={{
              background: '#fee2e2', border: 'none', borderRadius: 6,
              padding: '.15rem .45rem', fontSize: '.7rem', cursor: 'pointer', color: '#dc2626', fontWeight: 700
            }}>🗑️</button>
          </div>
        </div>
      </div>

      {/* Health bar */}
      <div style={{ marginBottom: '.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.3rem' }}>
          <span style={{ fontSize: '.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>صحت اسکور</span>
          <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: '.85rem',
            color: isWarning ? 'var(--gold-600)' : 'var(--green-700)' }}>{crop.health}%</span>
        </div>
        <div className="health-bar-track">
          <div className={`health-bar-fill${isWarning ? ' warning' : ''}`} style={{ width: `${crop.health}%` }} />
        </div>
      </div>

      {/* Info chips */}
      <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', marginBottom: '.6rem' }}>
        {[
          { label: 'کھیت', val: crop.field },
          { label: 'بوائی', val: crop.planted },
          { label: 'کٹائی', val: crop.harvest },
        ].filter(x => x.val).map(({ label, val }) => (
          <div key={label} style={{ background: 'var(--cream)', borderRadius: 8, padding: '.3rem .6rem', fontSize: '.72rem', color: 'var(--text-secondary)' }}>
            <span style={{ color: 'var(--text-muted)' }}>{label}: </span>{val}
          </div>
        ))}
      </div>

      {/* Next action */}
      {crop.nextAction && (
        <div style={{ background: isWarning ? 'var(--gold-100)' : 'var(--green-100)',
          borderRadius: 'var(--radius-sm)', padding: '.5rem .75rem',
          display: 'flex', alignItems: 'center', gap: '.4rem', fontSize: '.82rem',
          color: isWarning ? 'var(--gold-700)' : 'var(--green-700)', fontWeight: 700 }}>
          ⏰ {crop.nextAction}
        </div>
      )}
    </div>
  );
}

// ─── Add/Edit Modal ─────────────────────────────────────────────────────────────
function CropModal({ initial, onSave, onClose }) {
  const isEdit = !!initial?.id;
  const [step, setStep] = useState(1); // 1 = pick crop, 2 = details

  const emptyForm = {
    name: '', icon: '🌾', variety: '', field: '', area: '',
    health: 80, status: 'اچھی حالت',
    plantedMonth: 'نومبر', plantedYear: '2025',
    harvestMonth: 'اپریل',  harvestYear: '2026',
    nextAction: '', soilMoisture: 60
  };

  const [form, setForm] = useState(() => {
    if (initial) {
      const [pm, py] = (initial.planted || 'نومبر 2025').split(' ');
      const [hm, hy] = (initial.harvest || 'اپریل 2026').split(' ');
      return { ...emptyForm, ...initial, plantedMonth: pm, plantedYear: py, harvestMonth: hm, harvestYear: hy };
    }
    return emptyForm;
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleQuickPick = (crop) => { set('name', crop.name); set('icon', crop.icon); setStep(2); };

  const handleSave = () => {
    if (!form.name.trim()) return;
    const crop = {
      ...form,
      id: initial?.id || 'crop-' + Date.now(),
      area: form.area || '1',
      planted: `${form.plantedMonth} ${form.plantedYear}`,
      harvest: `${form.harvestMonth} ${form.harvestYear}`,
      health: parseInt(form.health) || 80,
      soilMoisture: parseInt(form.soilMoisture) || 60,
    };
    onSave(crop);
  };

  const inpStyle = {
    width: '100%', padding: '.65rem .875rem', borderRadius: 10,
    border: '2px solid var(--green-200)', fontSize: '.9rem',
    fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
    background: 'white', direction: 'rtl'
  };
  const selStyle = { ...inpStyle, direction: 'rtl' };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(2px)' }} />

      {/* Sheet */}
      <div style={{
        position: 'relative', width: '100%', maxWidth: 480,
        background: 'white', borderRadius: '20px 20px 0 0',
        padding: '1.25rem', maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 -8px 32px rgba(0,0,0,.15)'
      }}>
        {/* Handle */}
        <div style={{ width: 40, height: 4, background: '#e5e7eb', borderRadius: 4, margin: '0 auto .75rem' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--green-800)' }}>
            {isEdit ? '✏️ فصل میں ترمیم' : '🌱 نئی فصل شامل کریں'}
          </h3>
          <button onClick={onClose} style={{ background: '#f3f4f6', border: 'none', borderRadius: '50%', width: 32, height: 32, fontSize: '1rem', cursor: 'pointer' }}>✕</button>
        </div>

        {/* Step 1 — Pick crop */}
        {!isEdit && step === 1 && (
          <div>
            <p style={{ fontSize: '.82rem', color: 'var(--text-muted)', marginBottom: '.75rem' }}>فصل منتخب کریں</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '.5rem', marginBottom: '1rem' }}>
              {COMMON_CROPS.map(c => (
                <button key={c.name} onClick={() => handleQuickPick(c)} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: '.25rem', padding: '.6rem .25rem', borderRadius: 12,
                  border: '2px solid var(--green-200)', background: 'var(--green-50)',
                  cursor: 'pointer', fontSize: '.72rem', fontWeight: 700, color: 'var(--green-800)'
                }}>
                  <span style={{ fontSize: '1.5rem' }}>{c.icon}</span>
                  {c.name}
                </button>
              ))}
            </div>
            <p style={{ textAlign: 'center', fontSize: '.78rem', color: 'var(--text-muted)', marginBottom: '.5rem' }}>یا اپنی فصل لکھیں</p>
            <div style={{ display: 'flex', gap: '.5rem' }}>
              <input value={form.name} onChange={e => set('name', e.target.value)}
                placeholder="فصل کا نام..." style={{ ...inpStyle, flex: 1 }} />
              <input value={form.icon} onChange={e => set('icon', e.target.value)}
                placeholder="🌾" style={{ ...inpStyle, width: 56, textAlign: 'center' }} />
            </div>
            <button onClick={() => form.name.trim() && setStep(2)}
              disabled={!form.name.trim()}
              style={{ width: '100%', marginTop: '.75rem', padding: '.8rem', borderRadius: 12,
                background: form.name.trim() ? 'var(--green-700)' : '#e5e7eb',
                color: form.name.trim() ? 'white' : '#9ca3af', border: 'none',
                fontWeight: 700, fontSize: '.95rem', cursor: form.name.trim() ? 'pointer' : 'not-allowed' }}>
              آگے ←
            </button>
          </div>
        )}

        {/* Step 2 — Details */}
        {(isEdit || step === 2) && (
          <div>
            {!isEdit && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '1rem',
                background: 'var(--green-100)', borderRadius: 10, padding: '.6rem .875rem' }}>
                <span style={{ fontSize: '1.4rem' }}>{form.icon}</span>
                <span style={{ fontWeight: 800, color: 'var(--green-800)' }}>{form.name}</span>
                <button onClick={() => setStep(1)} style={{ marginRight: 'auto', fontSize: '.75rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>← تبدیل کریں</button>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
              {/* Variety + Field */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '.3rem' }}>قسم (Variety)</label>
                  <input value={form.variety} onChange={e => set('variety', e.target.value)}
                    placeholder="مثلاً NIAB-878" style={inpStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '.3rem' }}>کھیت نمبر / نام</label>
                  <input value={form.field} onChange={e => set('field', e.target.value)}
                    placeholder="کھیت نمبر ۱" style={inpStyle} />
                </div>
              </div>

              {/* Area + Health */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '.3rem' }}>رقبہ (ایکڑ)</label>
                  <input type="number" min="0.1" step="0.5" value={form.area}
                    onChange={e => set('area', e.target.value)}
                    placeholder="5" style={inpStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '.3rem' }}>صحت {form.health}%</label>
                  <input type="range" min="0" max="100" value={form.health}
                    onChange={e => set('health', e.target.value)}
                    style={{ width: '100%', marginTop: '.5rem', accentColor: 'var(--green-700)' }} />
                </div>
              </div>

              {/* Planted */}
              <div>
                <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '.3rem' }}>بوائی کا مہینہ</label>
                <div style={{ display: 'flex', gap: '.5rem' }}>
                  <select value={form.plantedMonth} onChange={e => set('plantedMonth', e.target.value)} style={{ ...selStyle, flex: 2 }}>
                    {MONTH_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <select value={form.plantedYear} onChange={e => set('plantedYear', e.target.value)} style={{ ...selStyle, flex: 1 }}>
                    {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              {/* Harvest */}
              <div>
                <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '.3rem' }}>کٹائی کا مہینہ</label>
                <div style={{ display: 'flex', gap: '.5rem' }}>
                  <select value={form.harvestMonth} onChange={e => set('harvestMonth', e.target.value)} style={{ ...selStyle, flex: 2 }}>
                    {MONTH_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <select value={form.harvestYear} onChange={e => set('harvestYear', e.target.value)} style={{ ...selStyle, flex: 1 }}>
                    {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              {/* Status + Next Action */}
              <div>
                <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '.3rem' }}>حالت</label>
                <select value={form.status} onChange={e => set('status', e.target.value)} style={selStyle}>
                  <option value="اچھی حالت">✅ اچھی حالت</option>
                  <option value="توجہ درکار">⚠️ توجہ درکار</option>
                  <option value="خطرے میں">🔴 خطرے میں</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '.3rem' }}>اگلا کام (اختیاری)</label>
                <input value={form.nextAction} onChange={e => set('nextAction', e.target.value)}
                  placeholder="مثلاً: اگلا پانی 3 دن بعد" style={inpStyle} />
              </div>
            </div>

            <button onClick={handleSave} style={{
              width: '100%', marginTop: '1.25rem', padding: '.9rem',
              borderRadius: 14, background: 'linear-gradient(135deg, var(--green-800), var(--green-700))',
              color: 'white', border: 'none', fontWeight: 800, fontSize: '1rem', cursor: 'pointer'
            }}>
              {isEdit ? '✅ تبدیلیاں محفوظ کریں' : '✅ فصل شامل کریں'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function PestScoutingBanner() {
  const [expanded, setExpanded] = useState(true);

  return (
    <div style={{
      background: '#0f2010',
      borderRadius: 'var(--radius-lg)',
      padding: '1rem',
      marginBottom: '1rem',
      color: 'white',
      border: '1px solid #1E3A1E'
    }}>
      <div 
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ 
            width: 10, height: 10, borderRadius: '50%', background: '#ef4444', 
            boxShadow: '0 0 8px #ef4444', animation: 'pulse 2s infinite', flexShrink: 0 
          }} />
          <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#fca5a5' }}>
            🚨 ضلعی کیڑا انتباہ ریڈار — Punjab Pest Warning Directorate 2026
          </div>
        </div>
        <div style={{ fontSize: '1.2rem' }}>{expanded ? '▲' : '▼'}</div>
      </div>
      
      {expanded && (
        <div style={{ marginTop: '1rem' }}>
          <div style={{ 
            display: 'flex', overflowX: 'auto', gap: '0.75rem', paddingBottom: '0.5rem',
            scrollbarWidth: 'none', msOverflowStyle: 'none'
          }}>
            {/* Card 1 */}
            <div style={{ 
              minWidth: '220px', background: '#1E3A1E', padding: '0.8rem', borderRadius: '10px',
              borderRight: '4px solid #ef4444', flexShrink: 0
            }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>Multan / Bahawalpur</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <span style={{ fontSize: '1.2rem' }}>🦟</span>
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>کپاس سفید مکھی + گلابی سنڈی</span>
              </div>
              <div style={{ 
                display: 'inline-block', background: 'rgba(239,68,68,0.2)', color: '#fca5a5', 
                padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800, marginBottom: '8px'
              }}>
                ⚠️ 24% زیادہ خطرہ
              </div>
              <div style={{ fontSize: '0.75rem', color: '#bbf7d0' }}>
                <span style={{ color: '#3a7232', fontWeight: 700 }}>سپرے:</span> Confidor 200SL 250ml/ایکڑ
              </div>
            </div>

            {/* Card 2 */}
            <div style={{ 
              minWidth: '220px', background: '#1E3A1E', padding: '0.8rem', borderRadius: '10px',
              borderRight: '4px solid #ef4444', flexShrink: 0
            }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>Sahiwal / Okara</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <span style={{ fontSize: '1.2rem' }}>🥔</span>
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>آلو میں Late Blight</span>
              </div>
              <div style={{ 
                display: 'inline-block', background: 'rgba(239,68,68,0.2)', color: '#fca5a5', 
                padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800, marginBottom: '8px'
              }}>
                🔴 الرٹ
              </div>
              <div style={{ fontSize: '0.75rem', color: '#bbf7d0' }}>
                <span style={{ color: '#3a7232', fontWeight: 700 }}>سپرے:</span> Ridomil Gold MZ 68WG 600g/ایکڑ
              </div>
            </div>

            {/* Card 3 */}
            <div style={{ 
              minWidth: '220px', background: '#1E3A1E', padding: '0.8rem', borderRadius: '10px',
              borderRight: '4px solid #f59e0b', flexShrink: 0
            }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>Gujranwala / Sheikhupura</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <span style={{ fontSize: '1.2rem' }}>🌾</span>
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>چاول بلاسٹ بیماری</span>
              </div>
              <div style={{ 
                display: 'inline-block', background: 'rgba(245,158,11,0.2)', color: '#fcd34d', 
                padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800, marginBottom: '8px'
              }}>
                🟡 نگرانی
              </div>
              <div style={{ fontSize: '0.75rem', color: '#bbf7d0' }}>
                <span style={{ color: '#3a7232', fontWeight: 700 }}>سپرے:</span> Beam 75WP 150g/ایکڑ
              </div>
            </div>
          </div>
          <div style={{ 
            marginTop: '0.5rem', fontSize: '0.65rem', color: '#64748b', textAlign: 'left', direction: 'ltr'
          }}>
            ماخذ: Punjab Pest Warning & Quality Control of Pesticides, لاہور
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────────
export default function CropsPage() {
  const [crops, setCrops]       = useState(loadCrops);
  const [tasks, setTasks]       = useState(loadTasks);
  const [modal, setModal]       = useState(null); // null | 'new' | crop obj (edit)
  const [aiAdvice, setAiAdvice] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const { isOffline } = useOffline();

  // Stats
  const totalArea  = crops.reduce((s, c) => s + parseFloat(c.area || 0), 0);
  const avgHealth  = crops.length ? Math.round(crops.reduce((s, c) => s + (c.health || 0), 0) / crops.length) : 0;
  const avgMoisture = crops.length ? Math.round(crops.reduce((s, c) => s + (c.soilMoisture || 60), 0) / crops.length) : 60;
  const doneCount  = tasks.filter(t => t.done).length;

  const toggleTask = (id) => {
    const updated = tasks.map(t => t.id === id ? { ...t, done: !t.done } : t);
    setTasks(updated);
    localStorage.setItem('dehati_tasks', JSON.stringify(updated));
  };

  const handleSaveCrop = (crop) => {
    setCrops(prev => {
      const existing = prev.findIndex(c => c.id === crop.id);
      const updated  = existing >= 0
        ? prev.map(c => c.id === crop.id ? crop : c)
        : [...prev, crop];
      saveCrops(updated);
      return updated;
    });
    setModal(null);
  };

  const handleDelete = (id) => {
    if (!confirm('کیا آپ یہ فصل حذف کرنا چاہتے ہیں؟')) return;
    setCrops(prev => { const u = prev.filter(c => c.id !== id); saveCrops(u); return u; });
  };

  const getAdvice = async () => {
    if (isOffline || !crops.length || aiLoading) return;
    let cancelled = false;
    setAiLoading(true);
    try {
      const cropSummary = crops.map(c => `${c.name} (${c.area} ایکڑ، صحت ${c.health}%)`).join('، ');
      const data = await askAI(
        `میری فصلیں: ${cropSummary}۔ مٹی کی نمی ${avgMoisture}% ہے۔ آج کے موسم کے مطابق 3 عملی مشورے دیں۔`
      );
      if (!cancelled) setAiAdvice(data.answer);
    } catch {}
    finally { if (!cancelled) setAiLoading(false); }
    return () => { cancelled = true; };
  };

  return (
    <div className="page">
      <div className="page-content">

        {/* Hero */}
        <div style={{ background: 'linear-gradient(135deg, var(--green-800) 0%, var(--green-700) 100%)',
          borderRadius: 'var(--radius-xl)', padding: '1.25rem', color: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
              <span style={{ fontSize: '2rem' }}>🌾</span>
              <div>
                <h2 style={{ color: 'white', fontSize: '1.1rem', margin: 0 }}>میری فصل اور زمین</h2>
                <p style={{ opacity: .8, fontSize: '.75rem', margin: 0 }}>پنجاب، پاکستان</p>
              </div>
            </div>
            <button onClick={() => setModal('new')} style={{
              background: 'rgba(255,255,255,.2)', border: '1.5px solid rgba(255,255,255,.5)',
              borderRadius: 10, padding: '.45rem .85rem', color: 'white',
              fontWeight: 700, fontSize: '.82rem', cursor: 'pointer', backdropFilter: 'blur(4px)'
            }}>
              + فصل شامل کریں
            </button>
          </div>
          <div style={{ display: 'flex', gap: '1.25rem' }}>
            {[
              { label: 'کل رقبہ', val: `${totalArea} ایکڑ` },
              { label: 'فصلیں',   val: `${crops.length}` },
              { label: 'اوسط صحت', val: `${avgHealth}%` },
            ].map(({ label, val }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: '1.3rem' }}>{val}</div>
                <div style={{ fontSize: '.7rem', opacity: .75 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Leaf Scanner Banner */}
        <a href="/disease" style={{ textDecoration: 'none' }}>
          <div style={{
            background: 'linear-gradient(135deg, #162410 0%, #264D24 100%)',
            border: '2px solid #D4A373', borderRadius: 'var(--radius-lg)',
            padding: '1rem 1.25rem', color: 'white', display: 'flex',
            alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.8rem' }}>
              <span style={{ fontSize: '2.2rem' }}>🔬</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: '.95rem', color: '#E9C46A' }}>
                  پتے کا اسکینر و 306 بیماریوں کی ڈائریکٹری
                </div>
                <div style={{ fontSize: '.78rem', color: '#94a3b8', marginTop: 2 }}>
                  تصویر لیں یا 50+ پاکستانی ادویات کے نسخے دیکھیں
                </div>
              </div>
            </div>
            <span style={{ background: '#D4A373', color: '#1a2f0e', padding: '4px 12px', borderRadius: 20, fontWeight: 800, fontSize: '.75rem' }}>
              اسکین کریں ←
            </span>
          </div>
        </a>

        {/* Moisture + Weather */}
        <div style={{ display: 'flex', gap: '.75rem' }}>
          <div className="moisture-ring-wrap" style={{ flex: 1 }}>
            <div style={{ position: 'relative', width: 90, height: 90 }}>
              <MoistureRing pct={avgMoisture} size={90} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: '1.1rem', color: 'var(--green-800)' }}>{avgMoisture}%</span>
              </div>
            </div>
            <div style={{ fontWeight: 700, fontSize: '.82rem', marginTop: '.5rem', color: 'var(--text-primary)' }}>مٹی میں نمی</div>
            <div style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>
              {avgMoisture >= 60 ? '✅ مناسب' : avgMoisture >= 35 ? '⚠️ کم' : '🔴 بہت کم'}
            </div>
          </div>
          <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
            {[
              { icon: '🌡️', label: 'درجہ حرارت', val: '34°C' },
              { icon: '💨', label: 'ہوا',          val: '12 km/h' },
              { icon: '🌧️', label: 'بارش',         val: '0 mm' },
            ].map(({ icon, label, val }) => (
              <div key={label} style={{ background: 'var(--card)', border: '1.5px solid var(--green-200)',
                borderRadius: 'var(--radius-sm)', padding: '.5rem .75rem',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '.82rem' }}>{icon} {label}</span>
                <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '.85rem', color: 'var(--green-800)' }}>{val}</span>
              </div>
            ))}
          </div>
        </div>

        <PestScoutingBanner />

        {/* Crop Cards */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="section-title">فصلوں کی حالت</div>
            <span style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{crops.length} فصل</span>
          </div>

          {crops.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem',
              background: 'var(--green-50)', borderRadius: 'var(--radius-md)',
              border: '2px dashed var(--green-200)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '.5rem' }}>🌱</div>
              <div style={{ fontWeight: 700, color: 'var(--green-700)', marginBottom: '.3rem' }}>ابھی کوئی فصل نہیں</div>
              <div style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginBottom: '.75rem' }}>اپنی پہلی فصل شامل کریں</div>
              <button onClick={() => setModal('new')} style={{
                background: 'var(--green-700)', color: 'white', border: 'none',
                borderRadius: 10, padding: '.6rem 1.25rem', fontWeight: 700, cursor: 'pointer' }}>
                + فصل شامل کریں
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
              {crops.map(c => (
                <CropCard key={c.id} crop={c}
                  onDelete={handleDelete}
                  onEdit={(crop) => setModal(crop)} />
              ))}
              {/* Add more button */}
              <button onClick={() => setModal('new')} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.5rem',
                padding: '.75rem', borderRadius: 'var(--radius-md)',
                border: '2px dashed var(--green-300)', background: 'var(--green-50)',
                color: 'var(--green-700)', fontWeight: 700, fontSize: '.88rem', cursor: 'pointer'
              }}>
                🌱 + مزید فصل شامل کریں
              </button>
            </div>
          )}
        </div>

        {/* Task List */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.75rem' }}>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>آج کے کام</div>
            <span style={{ background: doneCount === tasks.length ? 'var(--green-100)' : 'var(--gold-100)',
              color: doneCount === tasks.length ? 'var(--green-700)' : 'var(--gold-700)',
              borderRadius: 'var(--radius-full)', fontSize: '.72rem', fontWeight: 800, padding: '.15rem .55rem' }}>
              {doneCount}/{tasks.length} مکمل
            </span>
          </div>
          {tasks.map(task => (
            <div key={task.id} className="task-item" onClick={() => toggleTask(task.id)} style={{ cursor: 'pointer' }}>
              <div className={`task-check${task.done ? ' done' : ''}`}>{task.done && '✓'}</div>
              <div style={{ flex: 1 }}>
                <div className={`task-label${task.done ? ' done' : ''}`}>{task.icon} {task.label}</div>
              </div>
              <div className="task-date">{task.date}</div>
            </div>
          ))}
        </div>

        {/* AI Advice */}
        <div>
          <button className="btn btn-primary btn-full" onClick={getAdvice}
            disabled={aiLoading || isOffline || crops.length === 0} id="crops-ai-btn">
            {aiLoading ? '⏳ مشورہ مل رہا ہے...' : '🤖 آج کی فصل کے لیے AI مشورہ لیں'}
          </button>
          {aiAdvice && (
            <div className="ai-response-card animate-fade-in-up" style={{ marginTop: '.75rem' }}>
              <div className="ai-response-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                <span style={{ fontWeight: 700 }}>🌾 AI زرعی مشورہ</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <AIDisclaimer small />
                  <AudioPlayer
                    text={aiAdvice}
                    langKey="ur"
                    label="🔊 سنیں"
                  />
                </div>
              </div>
              <MarkdownRenderer text={aiAdvice} />

              {/* PDF Prescription Export */}
              <button
                id="crops-pdf-export-btn"
                onClick={() => {
                  const date = new Date().toLocaleDateString('ur-PK');
                  const cropList = crops.map(c => `${c.icon || '🌾'} ${c.name} (${c.area || '?'} ایکڑ) — صحت: ${c.health || '?'}%`).join('\n              ');
                  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent('DehatiAI-' + date)}`;
                  const html = `<!DOCTYPE html>
<html lang="ur" dir="rtl">
<head>
<meta charset="UTF-8"/>
<title>DehatiAI — زرعی نسخہ ${date}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&display=swap');
  body { font-family: 'Noto Nastaliq Urdu', serif; direction: rtl; margin: 0; padding: 24px; color: #1a2f0e; background: #fff; }
  .header { background: linear-gradient(135deg,#162410,#264D24); color: white; padding: 20px 24px; border-radius: 12px; display: flex; justify-content: space-between; align-items: flex-start; }
  .logo { font-size: 28px; font-weight: 900; color: #E9C46A; }
  .subtitle { font-size: 13px; opacity: .85; margin-top: 4px; }
  .stamp { border: 3px solid #E9C46A; border-radius: 50%; width: 80px; height: 80px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 9px; color: #E9C46A; text-align: center; font-weight: 700; }
  .section { margin: 18px 0; border: 1px solid #e2f0d9; border-radius: 10px; padding: 14px 18px; }
  .section-title { font-size: 15px; font-weight: 700; color: #2e5a27; border-bottom: 2px solid #e2f0d9; padding-bottom: 8px; margin-bottom: 10px; }
  .row { display: flex; justify-content: space-between; gap: 12px; margin: 6px 0; font-size: 13px; }
  .label { color: #6b7280; min-width: 120px; }
  .value { font-weight: 700; color: #1a2f0e; }
  .med-card { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px 14px; margin: 8px 0; }
  .phi-box { background: #fef2f2; border: 2px solid #fca5a5; border-radius: 8px; padding: 12px 16px; margin: 12px 0; }
  .phi-title { font-size: 14px; font-weight: 800; color: #dc2626; margin-bottom: 6px; }
  .footer { margin-top: 24px; border-top: 2px solid #e2f0d9; padding-top: 14px; display: flex; justify-content: space-between; align-items: flex-start; font-size: 11px; color: #6b7280; }
  .qr { text-align: center; }
  .disclaimer { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 10px 14px; font-size: 11px; color: #92400e; margin-top: 12px; }
  @media print { body { padding: 8px; } button { display: none !important; } }
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="logo">🌾 DehatiAI</div>
    <div class="subtitle">پنجاب زرعی مشورہ نظام</div>
    <div class="subtitle">تاریخ اجراء: ${date}</div>
  </div>
  <div class="stamp">
    UAF<br/>تصدیق<br/>شدہ<br/>نسخہ
  </div>
</div>

<div class="section">
  <div class="section-title">🌱 فصل کی تفصیل</div>
  <pre style="font-family:inherit;white-space:pre-wrap;font-size:13px;color:#1a2f0e;margin:0">${cropList}</pre>
</div>

<div class="section">
  <div class="section-title">🔬 ResNet50 AI تشخیص</div>
  <div class="row"><span class="label">ماڈل:</span><span class="value">ResNet50 PyTorch Model (306 Classes)</span></div>
  <div class="row"><span class="label">ماڈل فائل:</span><span class="value">ResNet50-Plant-model-80.pth (74.58 MB)</span></div>
  <div class="row"><span class="label">تصدیقی ڈیٹابیس:</span><span class="value">Pakistan Agronomy Database — agronomyDatabase.json</span></div>
</div>

<div class="section">
  <div class="section-title">🤖 AI زرعی مشورہ</div>
  <div style="font-size:13px;line-height:1.9;white-space:pre-wrap">${aiAdvice.replace(/[#*`]/g, '').slice(0, 1200)}</div>
</div>

<div class="section">
  <div class="section-title">💊 تجویز کردہ پاکستانی ادویات</div>
  <div class="med-card"><strong>Nativo 75WG</strong> — Tebuconazole 50% + Trifloxystrobin 25% — 80g/ایکڑ — Rs. 1,800–2,300</div>
  <div class="med-card"><strong>Tilt 250EC</strong> — Propiconazole 25% EC — 200ml/ایکڑ — Rs. 1,100–1,400</div>
  <div class="med-card"><strong>Ridomil Gold MZ 68WG</strong> — Metalaxyl-M 4% + Mancozeb 64% — 600g/ایکڑ — Rs. 1,650–2,100</div>
  <div class="med-card"><strong>Confidor 200SL</strong> — Imidacloprid 20% — 250ml/ایکڑ — Rs. 900–1,200</div>
</div>

<div class="phi-box">
  <div class="phi-title">⚠️ احتیاطی وقفہ (PHI — Pre-Harvest Interval)</div>
  <div style="font-size:13px">سپرے کے <strong>14 دن</strong> بعد تک فصل منڈی میں نہ بیچیں اور نہ ہی استعمال کریں۔<br/>Nativo 75WG: <strong>30 دن</strong> | Tilt 250EC: <strong>21 دن</strong></div>
</div>

<div class="disclaimer">
  ⚠️ یہ نسخہ رہنمائی کے لیے ہے — حتمی فیصلہ مقامی زرعی افسر یا ماہر کریں۔ ہیلپ لائن: 0800-17000
</div>

<div class="footer">
  <div>
    <div><strong>DehatiAI</strong> — پاکستان کا پہلا AI زرعی مشیر</div>
    <div>یونیورسٹی آف ایگریکلچر فیصل آباد (UAF) رہنما اصولوں کے مطابق</div>
    <div>نسخہ نمبر: DAI-${Date.now().toString(36).toUpperCase()}</div>
  </div>
  <div class="qr">
    <img src="${qrUrl}" width="90" height="90" alt="QR Code" style="border:2px solid #e2f0d9;border-radius:8px"/>
    <div style="margin-top:4px;font-size:10px">تصدیق QR کوڈ</div>
  </div>
</div>

<div style="text-align:center;margin-top:20px">
  <button onclick="window.print()" style="background:#2e5a27;color:white;border:none;padding:10px 28px;border-radius:8px;font-size:15px;cursor:pointer;font-family:inherit">🖨️ پرنٹ کریں</button>
</div>
</body></html>`;
                  const w = window.open('', '_blank');
                  if (w) { w.document.write(html); w.document.close(); }
                }}
                style={{
                  marginTop: '.75rem', width: '100%', padding: '.75rem',
                  background: 'linear-gradient(135deg, #162410 0%, #264D24 100%)',
                  color: '#E9C46A', border: '1.5px solid #E9C46A',
                  borderRadius: 12, fontWeight: 800, fontSize: '.88rem',
                  cursor: 'pointer', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: '.5rem', fontFamily: 'inherit'
                }}
              >
                📄 ڈاؤنلوڈ زراعت نسخہ (Download Official Prescription PDF)
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Modal */}
      {modal && (
        <CropModal
          initial={modal === 'new' ? null : modal}
          onSave={handleSaveCrop}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
