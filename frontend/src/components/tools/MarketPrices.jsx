import { useState, useEffect } from 'react';
import { API_URL as API } from '../../config';
import InstitutionalBadge from '../ui/InstitutionalBadge';

const CATEGORIES = ['سب', 'اناج', 'نقدی فصل', 'سبزی', 'تیلدار', 'دالیں', 'کھاد'];
const STALE_HOURS = 48;
const nas = { fontFamily: '"Noto Nastaliq Urdu", serif', direction: 'rtl' };

// ─── PAMRA FAQ Quality Specifications ────────────────────────────────────────
const FAQ_SPECS = {
  'گندم (Wheat)': {
    icon: '🌾',
    moistureStandard: '10–12% (12% سے اوپر کٹوتی، 14% سے زائد پر مسترد)',
    trashLimit: 'زیادہ سے زیادہ 1.0% (مٹی، تنکے، گرد)',
    shriveledLimit: 'سکڑا اور ٹوٹا دانہ زیادہ سے زیادہ 6%',
    karnalBunt: 'کرنال بنٹ زیادہ سے زیادہ 3%',
    glutMonths: 'اپریل تا مئی (کٹائی کا زور — سستی ترین)',
    peakMonths: 'اکتوبر تا دسمبر (بوائی سے قبل و سٹاک — عروج قیمت)',
    priceSwing: '10% تا 15% منافع کا فرق',
    advice: 'اگر آپ کے پاس محفوظ گودام ہے تو گندم اپریل میں فورا بیچنے کے بجائے اکتوبر تک روکنے سے 10-15% زائد ریٹ ملتا ہے۔'
  },
  'باسمتی دھان (Basmati Paddy)': {
    icon: '🍚',
    moistureStandard: 'زیادہ سے زیادہ 14% (مل گیٹ کا سرکاری معیار)',
    trashLimit: 'زیادہ سے زیادہ 1.0%',
    shriveledLimit: 'کچا و پچکا دانہ 4% | ٹوٹا دانہ 2-3%',
    karnalBunt: 'خراب و داغدار دانہ زیادہ سے زیادہ 5%',
    glutMonths: 'اکتوبر تا نومبر (فصل کی آمد — قیمت کم ترین)',
    peakMonths: 'مارچ تا مئی (مون سون سے قبل و برآمدی ڈیمانڈ)',
    priceSwing: '15% تا 20% منافع کا فرق',
    advice: 'ملز نومبر میں کٹوتی زیادہ کرتی ہیں۔ خشک کر کے جنوری تا مارچ بیچنے پر کسان کو فی من 500 سے 800 روپے اضافی بچتے ہیں۔'
  },
  'کپاس / پھٹی (Seed Cotton)': {
    icon: '🌿',
    moistureStandard: '8–10% (10% سے زیادہ نمی پر وزن کاٹنے کی اجازت ہے)',
    trashLimit: 'پتے، ریت اور کچرا 5–7% سے کم ہو',
    shriveledLimit: 'پیلا داغدار دانہ / روئی 3–5%',
    karnalBunt: '—',
    glutMonths: 'ستمبر تا اکتوبر (پہلی چنائیوں کی کثرت)',
    peakMonths: 'جنوری تا مارچ (جننگ فیکٹریاں بند ہونے سے قبل)',
    priceSwing: '20% تا 25% منافع کا فرق',
    advice: 'شبنم کے وقت چنائی نہ کروائیں۔ خشک روئی لے جانے پر جنر کٹوتی نہیں کر سکتا۔'
  },
  'مکئی (Maize)': {
    icon: '🌽',
    moistureStandard: '14% معیار (پولٹری فیڈ اور سائیلج کیلئے)',
    trashLimit: 'کچرا 1.5% سے کم',
    shriveledLimit: 'ٹوٹا دانہ 4% سے کم',
    karnalBunt: '—',
    glutMonths: 'اگست تا ستمبر (خریف مکئی کٹائی)',
    peakMonths: 'دسمبر تا فروری (پولٹری فیڈ ملز کی طلب)',
    priceSwing: '10% تا 15% منافع کا فرق',
    advice: 'دھوپ میں سکھا کر نمی 14% پر لائیں تاکہ آڑھتی من مانی کٹوتی نہ کر سکے۔'
  },
};

function hoursAgo(isoString) {
  if (!isoString) return Infinity;
  return (Date.now() - new Date(isoString).getTime()) / 3_600_000;
}

function formatUpdatedAt(isoString) {
  if (!isoString) return null;
  const d = new Date(isoString);
  const h = hoursAgo(isoString);
  if (h < 1)  return 'ابھی درج کی گئی';
  if (h < 24) return `${Math.floor(h)} گھنٹے پہلے`;
  return d.toLocaleDateString('ur-PK', { day: 'numeric', month: 'long' });
}

function PriceRow({ item }) {
  const isStale = item.isReal && hoursAgo(item.updatedAt) > STALE_HOURS;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid #f3f4f6', background: 'white' }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '.95rem', direction: 'rtl' }}>{item.nameUrdu}</div>
        <div style={{ fontSize: '.7rem', color: '#6b7280', marginTop: 2, direction: 'rtl' }}>
          {item.unit} · {item.category}
        </div>
        <div style={{
          marginTop: 3, display: 'inline-flex', alignItems: 'center', gap: 3,
          fontSize: '.65rem', fontWeight: 700,
          color: item.isReal && !isStale ? '#16a34a' : '#92400e',
          background: item.isReal && !isStale ? '#f0fdf4' : '#fffbeb',
          border: `1px solid ${item.isReal && !isStale ? '#bbf7d0' : '#fde68a'}`,
          borderRadius: 6, padding: '1px 6px', direction: 'rtl'
        }}>
          {item.isReal && !isStale && '✅ '}
          {item.isReal && isStale  && '⚠️ '}
          {!item.isReal            && '📊 '}
          {item.isReal && !isStale && formatUpdatedAt(item.updatedAt)}
          {item.isReal &&  isStale && `پرانی قیمت · ${formatUpdatedAt(item.updatedAt)}`}
          {!item.isReal            && 'حوالہ قیمت · نمونہ ڈیٹا'}
        </div>
      </div>
      <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: '1.05rem', color: item.isReal && !isStale ? '#166534' : '#78350f', flexShrink: 0, marginRight: 4 }} dir="ltr">
        ₨{Number(item.price).toLocaleString()}
      </div>
    </div>
  );
}

export default function MarketPrices() {
  const [activeTab, setActiveTab] = useState('prices'); // 'prices' | 'deductions' | 'cycles'

  // Prices State
  const [prices, setPrices]             = useState([]);
  const [filter, setFilter]             = useState('سب');
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [realCount, setRealCount]       = useState(0);
  const [isOfflineSnapshot, setIsOfflineSnapshot] = useState(false);

  // Deduction Calculator State
  const [calcCrop, setCalcCrop]         = useState('گندم (Wheat)');
  const [maunds, setMaunds]             = useState('100');
  const [ratePerMaund, setRatePerMaund] = useState('3900');
  const [moisturePct, setMoisturePct]   = useState('11');
  const [actualCutPct, setActualCutPct] = useState('6'); // farmer's reported cut %
  const [deductionResult, setDeductionResult] = useState(null);

  const fetchPrices = async () => {
    try {
      setError(null);
      const res = await fetch(`${API}/api/admin/prices/public`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setPrices(data.prices || []);
      setRealCount(data.realCount || 0);
      setIsOfflineSnapshot(false);

      try {
        localStorage.setItem('dehati_mandi_prices_snapshot', JSON.stringify({
          prices: data.prices || [],
          realCount: data.realCount || 0,
          timestamp: Date.now()
        }));
      } catch {}
    } catch {
      setError('سرور سے لائیو ڈیٹا نہیں ملا — آف لائن ڈیٹا دکھایا جا رہا ہے');
      try {
        const raw = localStorage.getItem('dehati_mandi_prices_snapshot');
        if (raw) {
          const snap = JSON.parse(raw);
          setPrices(snap.prices || []);
          setRealCount(snap.realCount || 0);
          setIsOfflineSnapshot(true);
        }
      } catch {}
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices();
    const t = setInterval(fetchPrices, 10 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  const calculateDeduction = () => {
    const m = parseFloat(maunds) || 0;
    const r = parseFloat(ratePerMaund) || 0;
    const moist = parseFloat(moisturePct) || 0;
    const reportedCut = parseFloat(actualCutPct) || 0;

    const grossValue = m * r;
    const bags = Math.ceil(m * 40 / 50); // 50kg bags

    // Legal PAMRA Rates:
    // Market Committee: 2.5%
    // Commission (Arhat): 2.5%
    // Palledari (Labor): Rs. 2.5 per 50kg bag
    const legalMarketFee = +(grossValue * 0.025).toFixed(0);
    const legalArhatFee  = +(grossValue * 0.025).toFixed(0);
    const legalPalledari = +(bags * 2.5).toFixed(0);
    const totalLegalFee  = legalMarketFee + legalArhatFee + legalPalledari;
    const legalNetTakeHome = grossValue - totalLegalFee;

    // Actual deducted cash reported by farmer
    const actualCutCash = +(grossValue * (reportedCut / 100)).toFixed(0);
    const actualNetTakeHome = grossValue - actualCutCash;

    // Moisture check
    const isMoistureHigh = (calcCrop.includes('Wheat') && moist > 12) || (calcCrop.includes('Paddy') && moist > 14);
    const isIllegalOvercharge = reportedCut > 8.5 || (!isMoistureHigh && reportedCut > 6.0);
    const excessCutCash = Math.max(0, actualCutCash - totalLegalFee);

    setDeductionResult({
      grossValue,
      bags,
      legalMarketFee,
      legalArhatFee,
      legalPalledari,
      totalLegalFee,
      legalNetTakeHome,
      actualCutCash,
      actualNetTakeHome,
      isIllegalOvercharge,
      excessCutCash,
      reportedCut
    });
  };

  const filtered = filter === 'سب' ? prices : prices.filter(p => p.category === filter);
  const allSample = realCount === 0;

  return (
    <div dir="rtl" style={{ ...nas }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #14532d, #166534)', borderRadius: 14, padding: '0.85rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'white' }}>
        <div style={{ fontSize: '1.6rem' }}>⚖️</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>منڈی ریٹس، کوٹ کٹوتی و PAMRA قوانین</div>
          <div style={{ color: '#bbf7d0', fontSize: '0.72rem', marginTop: 2 }}>
            پنجاب ایگریکلچرل مارکیٹنگ ریگولیٹری اتھارٹی (PAMRA) مصدقہ معیار
          </div>
        </div>
      </div>

      {/* Top Switcher */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 12 }}>
        <button
          onClick={() => setActiveTab('prices')}
          style={{
            padding: '8px 4px', borderRadius: 8,
            border: `2px solid ${activeTab === 'prices' ? '#15803d' : '#e2e8f0'}`,
            background: activeTab === 'prices' ? '#f0fdf4' : 'white',
            color: activeTab === 'prices' ? '#15803d' : '#64748b',
            fontWeight: 800, fontSize: '.78rem', cursor: 'pointer', ...nas
          }}
        >
          📊 منڈی ریٹ
        </button>
        <button
          onClick={() => setActiveTab('deductions')}
          style={{
            padding: '8px 4px', borderRadius: 8,
            border: `2px solid ${activeTab === 'deductions' ? '#b45309' : '#e2e8f0'}`,
            background: activeTab === 'deductions' ? '#fffbeb' : 'white',
            color: activeTab === 'deductions' ? '#b45309' : '#64748b',
            fontWeight: 800, fontSize: '.78rem', cursor: 'pointer', ...nas
          }}
        >
          ⚖️ کٹوتی چیکر
        </button>
        <button
          onClick={() => setActiveTab('cycles')}
          style={{
            padding: '8px 4px', borderRadius: 8,
            border: `2px solid ${activeTab === 'cycles' ? '#0369a1' : '#e2e8f0'}`,
            background: activeTab === 'cycles' ? '#f0f9ff' : 'white',
            color: activeTab === 'cycles' ? '#0369a1' : '#64748b',
            fontWeight: 800, fontSize: '.78rem', cursor: 'pointer', ...nas
          }}
        >
          📈 قیمت سائیکل
        </button>
      </div>

      {/* ── TAB 1: PRICES LIST ──────────────────────────────────────────────── */}
      {activeTab === 'prices' && (
        <div>
          {isOfflineSnapshot && (
            <div style={{ background: '#162410', color: '#fbc02d', padding: '.65rem 1rem', borderRadius: 12, border: '1px solid #3a7232', fontSize: '.82rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.75rem' }}>
              <span>⚡ آف لائن موڈ — آخری محفوظ شدہ منڈی ریٹ</span>
              <span style={{ fontSize: '.7rem', background: 'rgba(251,192,45,0.2)', color: '#fbc02d', border: '1px solid #fbc02d', padding: '2px 8px', borderRadius: 10 }}>آف لائن</span>
            </div>
          )}

          <div style={{ borderRadius: 10, padding: '10px 14px', marginBottom: 12, background: allSample ? '#fffbeb' : '#f0fdf4', border: `1px solid ${allSample ? '#fde68a' : '#bbf7d0'}`, lineHeight: 1.5 }}>
            {allSample ? (
              <div style={{ fontSize: '.75rem', color: '#92400e' }}>
                <strong>📊 حوالہ ڈیٹا (Sample Baseline):</strong> ایڈمن روزانہ پنجاب کی غلہ منڈیوں سے تصدیق شدہ اصل نرخ درج کرے گا۔
              </div>
            ) : (
              <div style={{ fontSize: '.75rem', color: '#15803d' }}>
                <strong>✅ {realCount} فصلوں کے نرخ آج اپ ڈیٹ کیے گئے</strong> — پنجاب منڈی ڈیٹا۔
              </div>
            )}
          </div>

          {/* Category Chips */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 10 }}>
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setFilter(c)}
                style={{
                  padding: '5px 12px', borderRadius: 20, whiteSpace: 'nowrap',
                  border: `1.5px solid ${filter === c ? '#15803d' : '#e2e8f0'}`,
                  background: filter === c ? '#15803d' : 'white',
                  color: filter === c ? 'white' : '#475569',
                  fontSize: '.75rem', fontWeight: 700, cursor: 'pointer', ...nas
                }}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Prices Rows */}
          <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>لوڈ ہو رہا ہے...</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>کوئی ڈیٹا موجود نہیں</div>
            ) : (
              filtered.map(item => <PriceRow key={item.id} item={item} />)
            )}
          </div>
          <div style={{ marginTop: 12 }}>
            <InstitutionalBadge type="pamra" helpline="0800-17000" />
          </div>
        </div>
      )}

      {/* ── TAB 2: PAMRA DEDUCTION & FAQ CHECKER ─────────────────────────────── */}
      {activeTab === 'deductions' && (
        <div className="form-group">
          {/* Crop Selection */}
          <div>
            <label className="input-label" style={{ fontWeight: 700, marginBottom: 6, display: 'block' }}>فصل منتخب کریں:</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {Object.keys(FAQ_SPECS).map(c => (
                <button key={c} onClick={() => { setCalcCrop(c); setDeductionResult(null); }}
                  style={{
                    padding: '8px', borderRadius: 8,
                    border: `2px solid ${calcCrop === c ? '#b45309' : '#e2e8f0'}`,
                    background: calcCrop === c ? '#fffbeb' : 'white',
                    color: calcCrop === c ? '#b45309' : '#334155',
                    fontWeight: 800, fontSize: '.78rem', cursor: 'pointer', ...nas
                  }}
                >
                  {FAQ_SPECS[c].icon} {c}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity & Rate */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
            <div>
              <label className="input-label" style={{ fontWeight: 700, marginBottom: 4, display: 'block' }}>کل مقدار (من):</label>
              <input type="number" className="input" placeholder="100" value={maunds} dir="ltr"
                onChange={e => { setMaunds(e.target.value); setDeductionResult(null); }}
                style={{ width: '100%', padding: '.55rem .75rem', borderRadius: 8, border: '1.5px solid #cbd5e1', fontSize: '1rem', fontWeight: 800, fontFamily: 'Inter' }}
              />
            </div>
            <div>
              <label className="input-label" style={{ fontWeight: 700, marginBottom: 4, display: 'block' }}>طے شدہ ریٹ (فی من روپے):</label>
              <input type="number" className="input" placeholder="3900" value={ratePerMaund} dir="ltr"
                onChange={e => { setRatePerMaund(e.target.value); setDeductionResult(null); }}
                style={{ width: '100%', padding: '.55rem .75rem', borderRadius: 8, border: '1.5px solid #cbd5e1', fontSize: '1rem', fontWeight: 800, fontFamily: 'Inter' }}
              />
            </div>
          </div>

          {/* Moisture % & Reported Cut */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
            <div>
              <label className="input-label" style={{ fontWeight: 700, marginBottom: 4, display: 'block' }}>نمی کا تناسب (% Moisture):</label>
              <input type="number" className="input" placeholder="11" value={moisturePct} dir="ltr"
                onChange={e => { setMoisturePct(e.target.value); setDeductionResult(null); }}
                style={{ width: '100%', padding: '.55rem .75rem', borderRadius: 8, border: '1.5px solid #cbd5e1', fontSize: '1rem', fontWeight: 800, fontFamily: 'Inter' }}
              />
            </div>
            <div>
              <label className="input-label" style={{ fontWeight: 700, marginBottom: 4, display: 'block' }}>آڑھتی کی کاٹی گئی کل کٹوتی (%):</label>
              <input type="number" className="input" placeholder="6" value={actualCutPct} dir="ltr"
                onChange={e => { setActualCutPct(e.target.value); setDeductionResult(null); }}
                style={{ width: '100%', padding: '.55rem .75rem', borderRadius: 8, border: '1.5px solid #cbd5e1', fontSize: '1rem', fontWeight: 800, fontFamily: 'Inter' }}
              />
            </div>
          </div>

          {/* Calculate Button */}
          <button className="btn btn-primary btn-full" id="pamra-calc-btn"
            onClick={calculateDeduction}
            style={{ width: '100%', marginTop: 12, fontSize: '0.95rem', padding: '0.75rem', background: 'linear-gradient(135deg, #b45309, #d97706)', color: 'white', borderRadius: 10, border: 'none', fontWeight: 800, cursor: 'pointer', ...nas }}
          >
            ⚖️ قانونی PAMRA کٹوتی و بچت حساب لگائیں
          </button>

          {/* Deduction Result */}
          {deductionResult && (
            <div className="animate-fade-in-up" style={{ marginTop: 14 }}>
              {/* Illegal Overcharge Alert */}
              {deductionResult.isIllegalOvercharge ? (
                <div style={{ background: '#fef2f2', border: '1.5px solid #ef4444', borderRadius: 12, padding: '10px 14px', marginBottom: 12 }}>
                  <div style={{ fontWeight: 800, color: '#b91c1c', fontSize: '.88rem' }}>
                    ⛔ ممکنہ غیر قانونی کٹوتی (Illegal Koot / Dami Alert)!
                  </div>
                  <div style={{ fontSize: '.72rem', color: '#991b1b', marginTop: 4, lineHeight: 1.5 }}>
                    آڑھتی نے آپ سے <strong>{deductionResult.reportedCut}%</strong> کٹوتی کاٹی ہے۔ PAMRA قوانین کے مطابق نمی 12% کے اندر ہو تو کوٹ یا من مانی کٹوتی جرم ہے! آپ سے تقریباً <strong>₨{deductionResult.excessCutCash.toLocaleString()}</strong> اضافی رقم کاٹی جا رہی ہے۔
                  </div>
                </div>
              ) : (
                <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 12, padding: '10px 14px', marginBottom: 12 }}>
                  <div style={{ fontWeight: 800, color: '#15803d', fontSize: '.88rem' }}>
                    ✅ کٹوتی قانونی حد کے اندر ہے
                  </div>
                  <div style={{ fontSize: '.72rem', color: '#166534', marginTop: 3 }}>
                    مارکیٹ کمیٹی، کمیشن اور پلے داری کے سرکاری نرخ نافذ ہیں۔
                  </div>
                </div>
              )}

              {/* Comparison Matrix */}
              <div style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
                <div style={{ background: '#1e293b', color: 'white', padding: '8px 12px', fontWeight: 800, fontSize: '.85rem' }}>
                  💰 فائنل حساب کتاب (کل آمدن: ₨{deductionResult.grossValue.toLocaleString()})
                </div>
                <div style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f1f5f9', fontSize: '.78rem' }}>
                    <span style={{ color: '#64748b' }}>مارکیٹ کمیٹی فیس (2.5%):</span>
                    <span style={{ fontWeight: 800, fontFamily: 'Inter' }}>₨{deductionResult.legalMarketFee.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f1f5f9', fontSize: '.78rem' }}>
                    <span style={{ color: '#64748b' }}>آڑھتی کمیشن / دامی (2.5%):</span>
                    <span style={{ fontWeight: 800, fontFamily: 'Inter' }}>₨{deductionResult.legalArhatFee.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f1f5f9', fontSize: '.78rem' }}>
                    <span style={{ color: '#64748b' }}>پلے داری و تولائی ({deductionResult.bags} بوریاں @ ₨2.5):</span>
                    <span style={{ fontWeight: 800, fontFamily: 'Inter' }}>₨{deductionResult.legalPalledari.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: '1.5px solid #cbd5e1', fontSize: '.9rem', fontWeight: 900, color: '#15803d' }}>
                    <span>کسان کی جائز وصولی (Net Legal Cash):</span>
                    <span style={{ fontFamily: 'Inter' }}>₨{deductionResult.legalNetTakeHome.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* FAQ Specs for Crop */}
              <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 12, padding: '10px 14px', marginBottom: 12 }}>
                <div style={{ fontWeight: 800, color: '#92400e', fontSize: '.85rem', marginBottom: 6 }}>
                  📋 سرکاری FAQ کوالٹی معیار ({calcCrop}):
                </div>
                <div style={{ fontSize: '.72rem', color: '#78350f', lineHeight: 1.6 }}>
                  • <strong>نمی کی حد:</strong> {FAQ_SPECS[calcCrop].moistureStandard}<br />
                  • <strong>کچرا / مٹی:</strong> {FAQ_SPECS[calcCrop].trashLimit}<br />
                  • <strong>ٹوٹا دانہ / نقص:</strong> {FAQ_SPECS[calcCrop].shriveledLimit}
                </div>
              </div>

              <InstitutionalBadge type="pamra" helpline="0800-17000" />
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: SEASONAL PRICE CYCLES ────────────────────────────────────── */}
      {activeTab === 'cycles' && (
        <div>
          <div style={{ fontSize: '.78rem', color: '#475569', marginBottom: 10, lineHeight: 1.5 }}>
            پنجاب زرعی مارکیٹس کے تاریخی ڈیٹا کے مطابق ہر فصل کے کٹائی سیزن میں منڈی مندی ہوتی ہے اور آف سیزن میں قیمت عروج پر جاتی ہے۔
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Object.entries(FAQ_SPECS).map(([name, d]) => (
              <div key={name} style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '10px 14px', borderRight: '4px solid #0284c7' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ fontWeight: 800, color: '#0369a1', fontSize: '.92rem' }}>
                    {d.icon} {name}
                  </div>
                  <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: 12, fontSize: '.68rem', fontWeight: 800 }}>
                    {d.priceSwing}
                  </span>
                </div>
                <div style={{ fontSize: '.72rem', color: '#334155', lineHeight: 1.5 }}>
                  🔻 <strong>سستی ترین قیمت (Harvest Glut):</strong> {d.glutMonths}<br />
                  🔺 <strong>عروج ترین قیمت (Peak Months):</strong> {d.peakMonths}<br />
                  💡 <strong>کسان کیلئے مشورہ:</strong> {d.advice}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 12 }}>
            <InstitutionalBadge type="pamra" helpline="0800-17000" />
          </div>
        </div>
      )}
    </div>
  );
}
