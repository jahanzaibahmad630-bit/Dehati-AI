import { useState, useEffect } from 'react';
import { askAI } from '../services/api';
import AIDisclaimer from '../components/ui/AIDisclaimer';
import { useOffline } from '../hooks/useOffline';

const CROPS = [
  {
    id: 'wheat', icon: '🌾', name: 'گندم', field: 'کھیت نمبر ۱', area: '5 ایکڑ',
    health: 82, status: 'اچھی حالت', statusColor: 'green',
    nextAction: 'اگلا پانی: 3 دن بعد', variety: 'اوقاس 2000',
    soilMoisture: 68, planted: 'نومبر 2025', harvest: 'اپریل 2026'
  },
  {
    id: 'cotton', icon: '🪻', name: 'کپاس', field: 'کھیت نمبر ۲', area: '3 ایکڑ',
    health: 61, status: 'توجہ درکار', statusColor: 'warning',
    nextAction: 'سپرے کریں: کل', variety: 'NIAB-878',
    soilMoisture: 45, planted: 'مئی 2026', harvest: 'نومبر 2026'
  },
];

const DEFAULT_TASKS = [
  { id: 1, label: 'گندم کو پانی دیں', date: 'آج', done: false, icon: '💧' },
  { id: 2, label: 'کپاس پر سپرے کریں', date: 'کل', done: false, icon: '🌿' },
  { id: 3, label: 'منڈی میں گندم کی قیمت چیک کریں', date: 'جمعہ', done: false, icon: '📈' },
  { id: 4, label: 'DAP کھاد خریدیں', date: 'ہفتے', done: false, icon: '🌱' },
  { id: 5, label: 'زرعی افسر سے ملیں', date: 'اگلا ہفتہ', done: false, icon: '👨‍🌾' },
];

function loadTasks() {
  try { return JSON.parse(localStorage.getItem('dehati_tasks') || 'null') || DEFAULT_TASKS; }
  catch { return DEFAULT_TASKS; }
}

// Animated SVG moisture ring
function MoistureRing({ pct = 65, size = 100 }) {
  const r = (size - 14) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const cx = size / 2, cy = size / 2;

  const color = pct >= 60 ? '#2e5a27' : pct >= 35 ? '#fbc02d' : '#dc2626';

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e8f5e3" strokeWidth="10" />
      <circle
        cx={cx} cy={cy} r={r} fill="none"
        stroke={color} strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        style={{ transition: 'stroke-dasharray 1.2s ease' }}
      />
    </svg>
  );
}

function CropCard({ crop }) {
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
          <span style={{
            fontSize: '1.8rem', width: 44, height: 44, borderRadius: 12,
            background: 'var(--green-100)', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>{crop.icon}</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem' }}>{crop.name}</div>
            <div style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>{crop.variety} • {crop.area}</div>
          </div>
        </div>
        <div style={badgeStyle}>{isWarning ? '⚠️' : '✅'} {crop.status}</div>
      </div>

      {/* Health bar */}
      <div style={{ marginBottom: '.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.3rem' }}>
          <span style={{ fontSize: '.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>صحت اسکور</span>
          <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: '.85rem', color: isWarning ? 'var(--gold-600)' : 'var(--green-700)' }}>
            {crop.health}%
          </span>
        </div>
        <div className="health-bar-track">
          <div className={`health-bar-fill${isWarning ? ' warning' : ''}`} style={{ width: `${crop.health}%` }} />
        </div>
      </div>

      {/* Info row */}
      <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', marginBottom: '.6rem' }}>
        {[
          { label: 'کھیت', val: crop.field },
          { label: 'بوائی', val: crop.planted },
          { label: 'کٹائی', val: crop.harvest },
        ].map(({ label, val }) => (
          <div key={label} style={{
            background: 'var(--cream)', borderRadius: 8, padding: '.3rem .6rem',
            fontSize: '.72rem', color: 'var(--text-secondary)'
          }}>
            <span style={{ color: 'var(--text-muted)' }}>{label}: </span>{val}
          </div>
        ))}
      </div>

      {/* Next action */}
      <div style={{
        background: isWarning ? 'var(--gold-100)' : 'var(--green-100)',
        borderRadius: 'var(--radius-sm)', padding: '.5rem .75rem',
        display: 'flex', alignItems: 'center', gap: '.4rem', fontSize: '.82rem',
        color: isWarning ? 'var(--gold-700)' : 'var(--green-700)', fontWeight: 700
      }}>
        ⏰ {crop.nextAction}
      </div>
    </div>
  );
}

export default function CropsPage() {
  const [tasks, setTasks] = useState(loadTasks);
  const [aiAdvice, setAiAdvice] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const { isOffline } = useOffline();

  const totalArea = CROPS.reduce((sum, c) => sum + parseFloat(c.area), 0);
  const avgHealth = Math.round(CROPS.reduce((sum, c) => sum + c.health, 0) / CROPS.length);
  const avgMoisture = Math.round(CROPS.reduce((sum, c) => sum + c.soilMoisture, 0) / CROPS.length);
  const doneCount = tasks.filter(t => t.done).length;

  const toggleTask = (id) => {
    const updated = tasks.map(t => t.id === id ? { ...t, done: !t.done } : t);
    setTasks(updated);
    localStorage.setItem('dehati_tasks', JSON.stringify(updated));
  };

  const getAdvice = async () => {
    if (isOffline) return;
    setAiLoading(true);
    try {
      const data = await askAI(
        `میری فصلیں گندم (5 ایکڑ، صحت 82%) اور کپاس (3 ایکڑ، صحت 61%) ہیں۔ مٹی کی نمی 57% ہے۔ آج کے موسم کے مطابق 3 عملی مشورے دیں۔`
      );
      setAiAdvice(data.answer);
    } catch {}
    finally { setAiLoading(false); }
  };

  return (
    <div className="page">
      <div className="page-content">

        {/* Hero */}
        <div style={{
          background: 'linear-gradient(135deg, var(--green-800) 0%, var(--green-700) 100%)',
          borderRadius: 'var(--radius-xl)', padding: '1.25rem', color: 'white'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '.75rem' }}>
            <span style={{ fontSize: '2rem' }}>🌾</span>
            <div>
              <h2 style={{ color: 'white', fontSize: '1.2rem', margin: 0 }}>میری فصل اور زمین</h2>
              <p style={{ opacity: .8, fontSize: '.78rem', margin: 0 }}>پنجاب، پاکستان</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1.25rem' }}>
            {[
              { label: 'کل رقبہ', val: `${totalArea} ایکڑ` },
              { label: 'فصلیں', val: `${CROPS.length}` },
              { label: 'اوسط صحت', val: `${avgHealth}%` },
            ].map(({ label, val }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: '1.3rem' }}>{val}</div>
                <div style={{ fontSize: '.7rem', opacity: .75 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Moisture Ring + Land Info */}
        <div style={{ display: 'flex', gap: '.75rem' }}>
          <div className="moisture-ring-wrap" style={{ flex: 1 }}>
            <div style={{ position: 'relative', width: 90, height: 90 }}>
              <MoistureRing pct={avgMoisture} size={90} />
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center'
              }}>
                <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: '1.1rem', color: 'var(--green-800)' }}>
                  {avgMoisture}%
                </span>
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
              { icon: '💨', label: 'ہوا', val: '12 km/h' },
              { icon: '🌧️', label: 'بارش', val: '0 mm' },
            ].map(({ icon, label, val }) => (
              <div key={label} style={{
                background: 'var(--card)', border: '1.5px solid var(--green-200)',
                borderRadius: 'var(--radius-sm)', padding: '.5rem .75rem',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <span style={{ fontSize: '.82rem' }}>{icon} {label}</span>
                <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '.85rem', color: 'var(--green-800)' }}>{val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Crop Cards */}
        <div>
          <div className="section-title">فصلوں کی حالت</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
            {CROPS.map(c => <CropCard key={c.id} crop={c} />)}
          </div>
        </div>

        {/* Task List */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.75rem' }}>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>آج کے کام</div>
            <span style={{
              background: doneCount === tasks.length ? 'var(--green-100)' : 'var(--gold-100)',
              color: doneCount === tasks.length ? 'var(--green-700)' : 'var(--gold-700)',
              borderRadius: 'var(--radius-full)', fontSize: '.72rem', fontWeight: 800,
              padding: '.15rem .55rem'
            }}>
              {doneCount}/{tasks.length} مکمل
            </span>
          </div>

          {tasks.map(task => (
            <div key={task.id} className="task-item" onClick={() => toggleTask(task.id)} style={{ cursor: 'pointer' }}>
              <div className={`task-check${task.done ? ' done' : ''}`}>
                {task.done && '✓'}
              </div>
              <div style={{ flex: 1 }}>
                <div className={`task-label${task.done ? ' done' : ''}`}>
                  {task.icon} {task.label}
                </div>
              </div>
              <div className="task-date">{task.date}</div>
            </div>
          ))}
        </div>

        {/* AI Advice */}
        <div>
          <button
            className="btn btn-primary btn-full"
            onClick={getAdvice}
            disabled={aiLoading || isOffline}
            id="crops-ai-btn"
          >
            {aiLoading ? '⏳ مشورہ مل رہا ہے...' : '🤖 آج کی فصل کے لیے AI مشورہ لیں'}
          </button>

          {aiAdvice && (
            <div className="ai-response-card animate-fade-in-up" style={{ marginTop: '.75rem' }}>
              <div className="ai-response-header">
                <span style={{ fontWeight: 700 }}>🌾 AI زرعی مشورہ</span>
                <AIDisclaimer small />
              </div>
              <div className="ai-response-body">{aiAdvice}</div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
