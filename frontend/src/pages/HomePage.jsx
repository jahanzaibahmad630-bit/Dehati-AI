import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOffline } from '../hooks/useOffline';
import { usePWAInstall } from '../hooks/usePWAInstall';

const QUICK_CHIPS = [
  { label: '💧 پانی', question: 'گندم کو کتنا پانی چاہیے اور کب دیں؟' },
  { label: '🐛 سنڈی', question: 'فصل میں سنڈی لگ گئی ہے، کیا کروں؟' },
  { label: '🌱 DAP', question: 'DAP کھاد کتنی ڈالیں اور کیسے؟' },
  { label: '🌽 مکئی', question: 'مکئی کب بوئیں اور کیا احتیاط کریں؟' },
  { label: '🐄 جانور', question: 'بھینس کا دودھ کم ہو گیا ہے، وجہ کیا ہے؟' },
  { label: '💳 کسان کارڈ', question: 'کسان کارڈ کیسے ملتا ہے؟' },
  { label: '🏦 ZTBL', question: 'ZTBL سے قرضہ کیسے لیں؟' },
  { label: '⏰ سپرے وقت', question: 'سپرے کرنے کا بہترین وقت کیا ہے؟' },
];

// Wheat price sparkline data (7 days, simulated around current market)
const SPARKLINE_DATA = [3750, 3820, 3800, 3870, 3840, 3910, 3900];

function Sparkline({ data, width = 260, height = 56 }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padX = 8, padY = 6;
  const w = width - padX * 2;
  const h = height - padY * 2;

  const points = data.map((v, i) => {
    const x = padX + (i / (data.length - 1)) * w;
    const y = padY + h - ((v - min) / range) * h;
    return `${x},${y}`;
  });
  const polylineStr = points.join(' ');
  const firstPt = points[0].split(',');
  const lastPt = points[points.length - 1].split(',');
  const areaPath = `M ${firstPt[0]},${height} L ${polylineStr.split(' ').join(' L ')} L ${lastPt[0]},${height} Z`;

  return (
    <svg width={width} height={height} style={{ overflow: 'visible', direction: 'ltr' }}>
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2e5a27" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#2e5a27" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#sparkGrad)" />
      <polyline points={polylineStr} fill="none" stroke="#2e5a27" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {data.map((v, i) => {
        const [x, y] = points[i].split(',');
        const isLast = i === data.length - 1;
        return (
          <circle key={i} cx={x} cy={y} r={isLast ? 5 : 3}
            fill={isLast ? '#fbc02d' : '#2e5a27'}
            stroke="white" strokeWidth={isLast ? 2 : 1.5}
          />
        );
      })}
    </svg>
  );
}

function getSeasonAdvice() {
  const m = new Date().getMonth() + 1;
  const h = new Date().getHours();
  const timeAdvice = h < 10 ? 'صبح سویرے سپرے کریں' : h > 17 ? 'شام کو پانی دیں' : 'دھوپ میں سپرے سے بچیں';
  if (m >= 5 && m <= 10) return { season: 'خریف', icon: '🌿', crops: 'چاول، مکئی، گنا، کپاس', advice: timeAdvice, color: '#16a34a' };
  return { season: 'ربیع', icon: '🌾', crops: 'گندم، سرسوں، آلو، چنا', advice: timeAdvice, color: '#92400e' };
}

// ── Month-precise Punjab crop action calendar (AARI/CCRI/RRI) ─────────────────
function getCropSeasonBanner() {
  const m = new Date().getMonth() + 1;
  const d = new Date().getDate();
  const BANNERS = {
    1:  { emoji: '🌾', color: '#15803d', bg: '#f0fdf4', border: '#86efac', urgency: 'info',
          title: 'گندم — پہلا پانی دیں (جنوری)',
          msg: 'گندم کی CRI (تاج جڑ) مرحلے پر پہلا پانی 21–25 دن پر لازمی دیں۔ پہلے پانی پر یوریا کی دوسری قسط ڈالیں۔ سرسوں میں گریبیج کیڑے کی نگرانی کریں۔' },
    2:  { emoji: '⚠️', color: '#b45309', bg: '#fffbeb', border: '#fde68a', urgency: 'warn',
          title: 'گندم — زنگ کا خطرہ (فروری)',
          msg: '⚠️ فروری میں سرد رطوبتی موسم میں پیلا زنگ (Yellow Rust) کا خطرہ بڑھ جاتا ہے۔ فصل دیکھتے رہیں — کوئی بھی زرد دھاریاں نظر آئیں تو Propiconazole (Tilt 250EC) 200ml فی ایکڑ فوری سپرے کریں۔' },
    3:  { emoji: '🌿', color: '#0369a1', bg: '#eff6ff', border: '#93c5fd', urgency: 'info',
          title: 'کپاس — اگیتی کاشت کا وقت (مارچ)',
          msg: '🌿 اگیتی کپاس (15 فروری تا 31 مارچ) کاشت کریں۔ CCRI ملتان مصدقہ ورائٹیاں: FH-333، CKC-01، MNH-1020۔ بیج کی مقدار: ایسڈ ڈیلنٹڈ 6–8 کلو/ایکڑ۔ بوائی پر یوریا ہرگز نہ ڈالیں!' },
    4:  { emoji: '🌾', color: '#b45309', bg: '#fffbeb', border: '#fde68a', urgency: 'warn',
          title: 'گندم — کٹائی کا وقت | کپاس جاری (اپریل)',
          msg: `${d <= 20 ? '⏳ گندم کٹائی: دانے میں نمی 12–14% پر کمبائن چلائیں۔ کٹائی کے فوراً بعد صاف خشک گودام میں رکھیں — اپریل میں قیمت کم ہوتی ہے، اکتوبر تک روکنے سے 10–15% زیادہ ملتا ہے۔' : '🌿 کپاس کی بوائی جاری رکھیں — 15 مئی تک مکمل کریں!'}`},
    5:  { emoji: '🌿', color: '#be123c', bg: '#fff1f2', border: '#fda4af', urgency: 'urgent',
          title: '⏰ کپاس — آخری تاریخ 15 مئی! (مئی)',
          msg: '⛔ 15 مئی کے بعد کپاس کی بوائی سے گلابی سنڈی کا خطرہ بڑھ جاتا ہے اور پیداوار 20–30% کم ہو سکتی ہے۔ فوری بوائی مکمل کریں! باسمتی نرسری 20 مئی سے شروع کریں۔' },
    6:  { emoji: '🍚', color: '#15803d', bg: '#f0fdf4', border: '#86efac', urgency: 'info',
          title: 'باسمتی نرسری — پنیری منتقلی (جون)',
          msg: '🍚 باسمتی نرسری بوائی: 20 مئی تا 20 جون۔ پنیری 25–30 دن بعد منتقل کریں (25 جون تا 20 جولائی)۔ کپاس: پہلا پانی (20–25 دن) پر پہلی یوریا قسط ڈالیں۔ سفید مکھی کی نگرانی شروع کریں۔' },
    7:  { emoji: '🦟', color: '#be123c', bg: '#fff1f2', border: '#fda4af', urgency: 'urgent',
          title: '⚠️ کپاس — سفید مکھی و گلابی سنڈی کا عروج (جولائی)',
          msg: '⚠️ جولائی میں سفید مکھی اور گلابی سنڈی کا زور ہوتا ہے۔ ETL: 10–12 بالغ مکھی فی پتہ۔ Spirotetramat (Movento) یا Buprofezin (Applaud) استعمال کریں۔ ہفتے میں ایک بار فصل دیکھیں!' },
    8:  { emoji: '🌾', color: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd', urgency: 'info',
          title: 'چاول — بلاسٹ بیماری کا خطرہ (اگست)',
          msg: '🌾 اگست میں باسمتی چاول میں گردن بلاسٹ کا خطرہ ہوتا ہے — خاص طور پر ابر آلود ٹھنڈے موسم میں۔ بوٹنگ مرحلے پر Trifloxystrobin (Nativo) یا Tebuconazole سپرے کریں۔ نائٹروجن کا زیادہ استعمال بیماری بڑھاتا ہے۔' },
    9:  { emoji: '🍚', color: '#15803d', bg: '#f0fdf4', border: '#86efac', urgency: 'info',
          title: 'چاول کٹائی — نمی چیک کریں (ستمبر)',
          msg: '🍚 باسمتی دھان کٹائی: 20–24% نمی پر کمبائن چلائیں، پھر 14% تک سکھائیں۔ کپاس: پھول و ٹنڈے بننے پر تیسری یوریا قسط ڈالیں۔ گندم کی اگیتی بوائی کی تیاری شروع کریں۔' },
    10: { emoji: '🌾', color: '#b45309', bg: '#fffbeb', border: '#fde68a', urgency: 'warn',
          title: '⏳ گندم بوائی کی تیاری (اکتوبر)',
          msg: `⏳ گندم کی بہترین بوائی: 1–20 نومبر۔ ابھی تیاری کریں: زمین ہموار کریں، بیج PSC سے لیں (42–45 کلو/ایکڑ)، DAP 2 بوری + SOP 1 بوری بوائی پر تیار رکھیں۔ ${d > 20 ? 'کینو کٹائی شروع کریں — TSS 10–11 بریکس پر کاٹیں۔' : ''}` },
    11: { emoji: '🌾', color: '#be123c', bg: '#fff1f2', border: '#fda4af', urgency: d <= 20 ? 'urgent' : 'warn',
          title: d <= 20 ? '✅ گندم بوائی — بہترین وقت (نومبر 1–20)' : '⚠️ گندم پچھیتی — فوری کاشت کریں! (نومبر 21+)',
          msg: d <= 20
            ? '✅ 1–20 نومبر گندم کی بہترین بوائی کا وقت ہے! بیج شرح: ڈرل 42–45 کلو، چھٹہ 48–50 کلو فی ایکڑ۔ بوائی کے ساتھ DAP 2 بوری + SOP 1 بوری + ⅓ یوریا بیسل پر ڈالیں۔ مصدقہ ورائٹی: دلکش-20، عروج-22'
            : '⚠️ 20 نومبر کے بعد ہر دن تاخیر پر پیداوار 1% کم ہوتی ہے! ابھی فوری بوائی کریں — بیج شرح بڑھا کر 60 کلو/ایکڑ کریں۔' },
    12: { emoji: '❄️', color: '#0369a1', bg: '#eff6ff', border: '#93c5fd', urgency: 'info',
          title: 'گندم — پالے سے بچاؤ (دسمبر)',
          msg: '❄️ دسمبر میں گندم کی CRI مرحلے (21–25 دن) پر پہلا پانی دیں — رات کا پالہ ٹوٹتا ہے۔ انتہائی پچھیتی بوائی (11–31 دسمبر): بیج 68–70 کلو/ایکڑ کریں۔ آلو: پالے کی صورت میں بوری یا فلم سے ڈھانپیں۔' },
  };
  return BANNERS[m] || BANNERS[11];
}

function getIrrigationAdvice() {
  const m = new Date().getMonth() + 1;
  if (m >= 5 && m <= 9) return 'گرمی زیادہ ہے — صبح 6-8 بجے یا شام 5-7 بجے پانی دیں';
  if (m === 12 || m === 1 || m === 2) return 'سردی میں دن کے وقت پانی دیں — فصل کو پالے سے بچائیں';
  return 'موسم معتدل ہے — ہفتے میں 2 بار پانی کافی ہے';
}

function getPestAlert() {
  const m = new Date().getMonth() + 1;
  if (m >= 6 && m <= 8) return { alert: true, msg: 'خبردار! سنڈی اور سست تیلا کا موسم — فوری سپرے کریں', color: 'var(--danger)' };
  if (m >= 3 && m <= 5) return { alert: true, msg: 'گندم میں زنگ اور بھبھوتیا کا خطرہ — نگرانی رکھیں', color: 'var(--warning)' };
  return { alert: false, msg: 'ابھی کوئی بڑا کیڑے کا خطرہ نہیں', color: 'var(--green-700)' };
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
            🌦️ عمومی موسمی کیڑا رجحان (تخمینہ)
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
                ⚠️ موسم کے لحاظ سے خطرہ
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
                ⚠️ موسمی رجحان
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
            ماخذ: DehatiAI موسمی تخمینہ — سرکاری تصدیق نہیں
          </div>
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  const { isOffline } = useOffline();
  const navigate = useNavigate();

  const season = getSeasonAdvice();
  const irrigationAdvice = getIrrigationAdvice();
  const pestAlert = getPestAlert();
  const cropBanner = getCropSeasonBanner();
  const { canInstall, isInstalled, install } = usePWAInstall();

  const shareOnWhatsApp = () => {
    const msg = encodeURIComponent(
      '🌾 DehatiAI — کسان کا AI مددگار\n\nفصل کی بیماری، موسم، مارکیٹ قیمتیں اور سرکاری اسکیمیں — سب ایک جگہ!\n\nhttps://dehati-ai.vercel.app'
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  // Today's greeting based on time
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'صبح بخیر' : hour < 17 ? 'دوپہر بخیر' : 'شام بخیر';
  const today = new Date().toLocaleDateString('ur-PK', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="page">
      <div className="page-content">

        {/* ── Hero Greeting Banner ── */}
        <div style={{
          background: 'linear-gradient(145deg, #1a3a0f 0%, #2F4A1E 60%, #3a5a25 100%)',
          borderRadius: 20, padding: '1.25rem 1.25rem 1rem',
          color: 'white', position: 'relative', overflow: 'hidden'
        }}>
          {/* Decorative circles */}
          <div style={{
            position: 'absolute', top: -30, left: -30, width: 120, height: 120,
            borderRadius: '50%', background: 'rgba(255,255,255,.04)', pointerEvents: 'none'
          }} />
          <div style={{
            position: 'absolute', bottom: -20, right: -20, width: 90, height: 90,
            borderRadius: '50%', background: 'rgba(251,192,45,.08)', pointerEvents: 'none'
          }} />

          {/* Date + greeting */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '.75rem' }}>
            <div>
              <div style={{ fontSize: '1.5rem', lineHeight: 1 }}>{season.icon}</div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', marginTop: '.3rem' }}>{greeting}!</div>
              <div style={{ fontSize: '.72rem', opacity: .7, marginTop: '.15rem', fontFamily: 'Inter, sans-serif' }}>{today}</div>
            </div>
            <div style={{
              background: 'rgba(251,192,45,.2)', border: '1px solid rgba(251,192,45,.4)',
              borderRadius: 10, padding: '5px 10px', textAlign: 'center'
            }}>
              <div style={{ fontSize: '.65rem', opacity: .8 }}>{season.season}</div>
              <div style={{ fontSize: '.7rem', fontWeight: 700, color: '#fde68a' }}>{season.crops.split('،')[0]}</div>
            </div>
          </div>

          {/* Pest / season alert strip */}
          {pestAlert.alert && (
            <div style={{
              background: 'rgba(239,68,68,.15)', border: '1px solid rgba(239,68,68,.35)',
              borderRadius: 8, padding: '6px 10px', fontSize: '.72rem',
              color: '#fca5a5', marginBottom: '.75rem', direction: 'rtl'
            }}>
              ⚠️ {pestAlert.msg}
            </div>
          )}

          {/* Action buttons row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '.5rem' }}>
            <button
              id="hero-chat-btn"
              onClick={() => navigate('/chat')}
              style={{
                background: '#fbc02d', color: '#1a2f0e',
                border: 'none', borderRadius: 12, padding: '10px 6px',
                fontWeight: 800, fontSize: '.78rem', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4
              }}
            >
              <span style={{ fontSize: '1.4rem' }}>🤖</span>
              AI سے پوچھیں
            </button>
            <button
              id="hero-disease-btn"
              onClick={() => navigate('/disease')}
              style={{
                background: 'rgba(255,255,255,.12)', color: 'white',
                border: '1px solid rgba(255,255,255,.2)',
                borderRadius: 12, padding: '10px 6px',
                fontWeight: 700, fontSize: '.78rem', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4
              }}
            >
              <span style={{ fontSize: '1.4rem' }}>🔬</span>
              بیماری چیک
            </button>
            <button
              id="hero-weather-btn"
              onClick={() => navigate('/weather')}
              style={{
                background: 'rgba(255,255,255,.12)', color: 'white',
                border: '1px solid rgba(255,255,255,.2)',
                borderRadius: 12, padding: '10px 6px',
                fontWeight: 700, fontSize: '.78rem', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4
              }}
            >
              <span style={{ fontSize: '1.4rem' }}>🌤️</span>
              موسم دیکھیں
            </button>
          </div>
        </div>

        {/* ── Monthly Crop Action Banner (AARI/CCRI/RRI Calendar) ── */}
        <div style={{
          background: cropBanner.bg,
          border: `1.5px solid ${cropBanner.border}`,
          borderRadius: 14, padding: '0.85rem 1rem', marginBottom: '0.75rem',
          borderRight: `5px solid ${cropBanner.color}`,
          direction: 'rtl'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <div style={{ fontWeight: 800, fontSize: '0.88rem', color: cropBanner.color }}>
              {cropBanner.emoji} {cropBanner.title}
            </div>
            {cropBanner.urgency === 'urgent' && (
              <span style={{ background: '#be123c', color: 'white', fontSize: '0.6rem', fontWeight: 800, padding: '2px 7px', borderRadius: 6 }}>فوری</span>
            )}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#374151', lineHeight: 1.6 }}>
            {cropBanner.msg}
          </div>
          <div style={{ marginTop: 6, fontSize: '0.62rem', color: '#6b7280' }}>
            📋 ماخذ: AARI فیصل آباد / CCRI ملتان / RRI کالا شاہ کاکو
          </div>
        </div>

        {/* ── Info Grid 2×2 ── */}
        <div className="dashboard-grid">
          <div className="dash-card" onClick={() => navigate('/weather')} id="dash-weather">
            <div className="dash-card-icon blue">🌤️</div>
            <div className="dash-card-label">موسم</div>
            <div className="dash-card-value" style={{ fontSize: '1.5rem' }}>28°C</div>
            <div className="dash-card-sub">صاف آسمان</div>
          </div>

          <div className="dash-card" onClick={() => navigate('/more')} id="dash-market">
            <div className="dash-card-icon gold">📈</div>
            <div className="dash-card-label">منڈی قیمت</div>
            <div className="dash-card-value" style={{ color: 'var(--green-700)', fontSize: '.9rem' }}>گندم</div>
            <div className="dash-card-sub" style={{ fontSize: '.65rem', color: 'var(--amber-600)' }}>حوالہ قیمت — نمونہ</div>
          </div>

          <div className="dash-card" onClick={() => navigate('/more')} id="dash-crops">
            <div className="dash-card-icon">🌾</div>
            <div className="dash-card-label">میری فصل</div>
            <div className="dash-card-value" style={{ fontSize: '1.5rem' }}>2</div>
            <div className="dash-card-sub">گندم • کپاس</div>
          </div>

          <div className="dash-card" onClick={() => navigate('/disease')} id="dash-disease">
            <div className="dash-card-icon red">🔬</div>
            <div className="dash-card-label">بیماری چیک</div>
            <div className="dash-card-value" style={{ fontSize: '1rem', color: 'var(--danger)' }}>فوری چیک</div>
            <div className="dash-card-sub">تصویر لیں</div>
          </div>
        </div>
        <PestScoutingBanner />

        {/* ── Quick Chips — navigate to Chat with pre-filled question ── */}
        <div>
          <div className="section-title">عام سوال</div>
          <div className="chips-scroll">
            {QUICK_CHIPS.map((chip, i) => (
              <button
                key={i}
                className="chip"
                onClick={() => navigate(`/chat?q=${encodeURIComponent(chip.question)}`)}
                id={`quick-chip-${i}`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Advice Cards ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
          <div className="section-title">آج کا مشورہ</div>

          <div className="advice-card irrigation">
            <div className="advice-icon">💧</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '.9rem', color: '#0369a1' }}>آبپاشی کا وقت</div>
              <div style={{ fontSize: '.82rem', color: '#0c4a6e', marginTop: '.2rem', lineHeight: 1.6 }}>{irrigationAdvice}</div>
            </div>
          </div>

          <div className={`advice-card pest`} style={{ borderColor: pestAlert.alert ? '#fca5a5' : '#bbf7d0' }}>
            <div className="advice-icon">🐛</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '.9rem', color: pestAlert.alert ? 'var(--danger)' : 'var(--green-700)' }}>
                {pestAlert.alert ? '⚠️ کیڑوں کا خطرہ' : '✅ کیڑے صاف'}
              </div>
              <div style={{ fontSize: '.82rem', marginTop: '.2rem', lineHeight: 1.6, color: '#7f1d1d' }}>{pestAlert.msg}</div>
            </div>
          </div>

          <div className="advice-card season">
            <div className="advice-icon">{season.icon}</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '.9rem', color: 'var(--gold-700)' }}>{season.season} کا موسم</div>
              <div style={{ fontSize: '.82rem', color: '#78350f', marginTop: '.2rem', lineHeight: 1.6 }}>
                {season.advice} • مناسب فصلیں: {season.crops}
              </div>
            </div>
          </div>
        </div>

        {/* ── Sparkline Price Chart ── */}
        <div className="sparkline-wrap">
          <div className="sparkline-header">
            <div>
              <div style={{ fontWeight: 700, fontSize: '.9rem' }}>📊 گندم قیمت رجحان</div>
              <div style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>پچھلے 7 دن (₨/من)</div>
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: '1.1rem', color: 'var(--green-800)', direction: 'ltr' }}>
                ₨{SPARKLINE_DATA[SPARKLINE_DATA.length - 1].toLocaleString()}
              </div>
              <div style={{ fontSize: '.7rem', color: 'var(--green-600)', direction: 'ltr', fontFamily: 'Inter, sans-serif' }}>
                +₨{(SPARKLINE_DATA[SPARKLINE_DATA.length - 1] - SPARKLINE_DATA[0]).toLocaleString()} ↑
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Sparkline data={SPARKLINE_DATA} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '.4rem', fontSize: '.68rem', color: 'var(--text-light)', fontFamily: 'Inter, sans-serif', direction: 'ltr' }}>
            <span>7 دن پہلے</span>
            <span style={{ color: 'var(--text-muted)' }}>کم: ₨{Math.min(...SPARKLINE_DATA).toLocaleString()} | زیادہ: ₨{Math.max(...SPARKLINE_DATA).toLocaleString()}</span>
            <span>آج</span>
          </div>
        </div>

        {/* ── Install / Share card ── */}
        <div style={{
          background: 'linear-gradient(135deg, #1a3a0f 0%, #2F4A1E 100%)',
          borderRadius: 'var(--radius-xl)',
          padding: '1.25rem',
          color: 'white',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '.4rem' }}>📲</div>
          <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '.3rem' }}>
            ایپ انسٹال کریں — مفت!
          </div>
          <div style={{ fontSize: '.78rem', opacity: .8, marginBottom: '1rem', lineHeight: 1.6 }}>
            ہوم اسکرین پر آئیکن · بغیر انٹرنیٹ بھی کام کرے گی<br />
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '.65rem' }}>
              Free · Works offline · Home screen icon
            </span>
          </div>
          <div style={{ display: 'flex', gap: '.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {canInstall && !isInstalled && (
              <button
                id="home-install-btn"
                onClick={install}
                style={{
                  background: '#FBF3E1', color: '#2F4A1E',
                  border: 'none', borderRadius: 12,
                  padding: '10px 20px', fontWeight: 800,
                  fontSize: '.875rem', cursor: 'pointer',
                  flex: 1, minWidth: 120
                }}
              >
                ⬇️ ابھی انسٹال کریں
              </button>
            )}
            {isInstalled && (
              <div style={{
                background: 'rgba(255,255,255,0.15)', borderRadius: 12,
                padding: '10px 20px', fontSize: '.875rem', fontWeight: 700,
                flex: 1
              }}>
                ✅ ایپ انسٹال ہو گئی!
              </div>
            )}
            <button
              id="home-whatsapp-share-btn"
              onClick={shareOnWhatsApp}
              style={{
                background: '#25D366', color: 'white',
                border: 'none', borderRadius: 12,
                padding: '10px 20px', fontWeight: 800,
                fontSize: '.875rem', cursor: 'pointer',
                flex: 1, minWidth: 120
              }}
            >
              📤 واٹس ایپ پر شیئر کریں
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
