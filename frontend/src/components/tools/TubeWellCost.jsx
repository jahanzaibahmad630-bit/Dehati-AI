import { useState } from 'react';
import InstitutionalBadge from '../ui/InstitutionalBadge';

const PIPE_SIZES = {
  '3 انچ':  { gpmPerHP: 18, label: '3"' },
  '4 انچ':  { gpmPerHP: 28, label: '4"' },
  '5 انچ':  { gpmPerHP: 40, label: '5"' },
  '6 انچ':  { gpmPerHP: 55, label: '6"' },
};

const getSolarKW = (hp, depth) => {
  const baseKW = hp * 0.746;
  const depthFactor = depth > 100 ? 1.3 : depth > 60 ? 1.15 : 1.0;
  return Math.ceil(baseKW * depthFactor * 1.25);
};

const PCRWR_DELTA = [
  { crop: 'گندم (Wheat)', delta: '14–18 ایکڑ انچ', irrigations: '4–6 پانی', critical: 'تاج جڑیں (21–25 دن)، شگوفے (40–45 دن)، بالیاں نکلنا' },
  { crop: 'کپاس (Cotton)', delta: '22–28 ایکڑ انچ', irrigations: '4–7 پانی', critical: 'گڈی بننا (40–45 دن)، پھول آنا، ٹینڈا بننا' },
  { crop: 'چاول باسمتی (Rice)', delta: '55–65 ایکڑ انچ', irrigations: '10–14 پانی', critical: 'پنیری منتقلی، گوب کی حالت (40–45 دن)، پھول آنا' },
  { crop: 'کماد / گنا (Sugarcane)', delta: '55–65 ایکڑ انچ', irrigations: '8–12 پانی', critical: 'شگوفے (30 دن)، تیز نشوونما (90–120 دن)' },
];

const REGIONAL_SOLAR_GUIDE = [
  { depth: '100–150 فٹ', hp: '5–7.5 HP', pipe: '3–4 انچ', cfs: '0.25–0.35 کیوسک', pv: '6–8 kWp', zones: 'ملتان، وہاڑی، لودھراں' },
  { depth: '150–250 فٹ', hp: '7.5–10 HP', pipe: '4 انچ', cfs: '0.30–0.40 کیوسک', pv: '9–11 kWp', zones: 'ساہیوال، فیصل آباد، خانیوال' },
  { depth: '250–350 فٹ', hp: '10–15 HP', pipe: '4–6 انچ', cfs: '0.35–0.50 کیوسک', pv: '12–16 kWp', zones: 'بہاولپور، رحیم یار خان' },
];

const nas = { fontFamily: '"Noto Nastaliq Urdu", serif', direction: 'rtl' };
const fmt = n => Number(n).toLocaleString('en-PK');

export default function TubeWellCost() {
  const [activeTab, setActiveTab] = useState('solar'); // 'solar' | 'water' | 'warabandi' | 'delta'

  // Tab 1: Solar / Diesel / Electric State
  const [hp, setHp] = useState('');
  const [depth, setDepth] = useState('');
  const [pipeSize, setPipeSize] = useState('4 انچ');
  const [hours, setHours] = useState('');
  const [solarResult, setSolarResult] = useState(null);

  // Tab 2: Water Quality & Gypsum State
  const [ec, setEc] = useState('1.5');
  const [sar, setSar] = useState('12');
  const [rsc, setRsc] = useState('2.8');
  const [acreFeet, setAcreFeet] = useState('1');
  const [waterResult, setWaterResult] = useState(null);

  // Tab 3: Canal Warabandi State
  const [totalCCA, setTotalCCA] = useState('100');     // Total chak acres
  const [myAcres, setMyAcres]   = useState('5');       // Farmer's acres
  const [distanceFt, setDistanceFt] = useState('3000'); // Distance from mogha in ft
  const [isTailEnd, setIsTailEnd]   = useState(false);
  const [warabandiResult, setWarabandiResult] = useState(null);

  const calculateSolar = () => {
    const h = parseFloat(hp);
    const d = parseFloat(depth);
    const hrs = parseFloat(hours);
    if (!h || !hrs || h <= 0 || hrs <= 0) return;

    const dieselLPerHr = h * 0.25;
    const dieselPricePerL = 310;
    const dieselDailyCost = dieselLPerHr * hrs * dieselPricePerL;
    const dieselMonthlyCost = dieselDailyCost * 30;

    const kW = h * 0.746;
    const unitsPerDay = kW * hrs;
    const electricRate = 42;
    const electricDailyCost = unitsPerDay * electricRate;
    const electricMonthlyCost = electricDailyCost * 30;

    const solarKW = getSolarKW(h, d || 50);
    const solarInstallCostPerKW = 75000;
    const totalSolarCost = solarKW * solarInstallCostPerKW;
    const subsidyPct = 0.67;
    const solarOwnCost = totalSolarCost * (1 - subsidyPct);

    const monthlySavingsDiesel = dieselMonthlyCost;
    const paybackMonthsDiesel = monthlySavingsDiesel > 0 ? Math.ceil(solarOwnCost / monthlySavingsDiesel) : 0;
    const paybackMonthsElectric = electricMonthlyCost > 0 ? Math.ceil(solarOwnCost / electricMonthlyCost) : 0;

    const pipeData = PIPE_SIZES[pipeSize];
    const gpm = pipeData ? pipeData.gpmPerHP * h : null;
    // 1 acre-inch = 27,154 gallons. Normal irrigation depth = 3 inches.
    const totalGallons = gpm ? gpm * hrs * 60 : 0;
    const acresPerDay = gpm ? +((totalGallons / 27154) / 3).toFixed(1) : null;

    setSolarResult({
      hp: h, hrs, depth: d, pipeSize,
      diesel: { daily: Math.round(dieselDailyCost), monthly: Math.round(dieselMonthlyCost), lPerDay: Math.round(dieselLPerHr * hrs) },
      electric: { daily: Math.round(electricDailyCost), monthly: Math.round(electricMonthlyCost), units: Math.round(unitsPerDay) },
      solar: { kW: solarKW, totalCost: Math.round(totalSolarCost), ownCost: Math.round(solarOwnCost) },
      paybackDiesel: paybackMonthsDiesel,
      paybackElectric: paybackMonthsElectric,
      acresPerDay,
    });
  };

  const calculateWaterQuality = () => {
    const e = parseFloat(ec) || 0;
    const s = parseFloat(sar) || 0;
    const r = parseFloat(rsc) || 0;
    const af = parseFloat(acreFeet) || 1;

    let status = 'fit';
    let statusLabel = 'میٹھا و محفوظ پانی (Fit)';
    let statusColor = '#15803d';
    let statusBg = '#f0fdf4';

    if (e > 2.0 || s > 18 || r > 2.5) {
      status = 'unfit';
      statusLabel = 'کھارا / مضرِ صحت پانی (Unfit — سخت خطرہ)';
      statusColor = '#dc2626';
      statusBg = '#fef2f2';
    } else if (e >= 0.7 || s >= 10 || r >= 1.25) {
      status = 'marginal';
      statusLabel = 'قابلِ استعمال بشرطِ احتیاط (Marginally Fit)';
      statusColor = '#d97706';
      statusBg = '#fffbeb';
    }

    const excessRSC = Math.max(0, r - 1.25);
    const gypsumBags = excessRSC > 0 ? Math.ceil((excessRSC / 0.5) * af) : 0;
    const gypsumKg = gypsumBags * 50;

    setWaterResult({
      status, statusLabel, statusColor, statusBg,
      e, s, r, af, excessRSC: excessRSC.toFixed(2),
      gypsumBags, gypsumKg
    });
  };

  // Canal Warabandi Calculator (Canal & Drainage Act 1873, Sec 68)
  const calculateWarabandi = () => {
    const cca = parseFloat(totalCCA) || 100;
    const myA = parseFloat(myAcres) || 1;
    const dist = parseFloat(distanceFt) || 0;

    // Standard week = 168 hours = 10,080 minutes
    const totalWeekMin = 168 * 60;

    // Standard filling allowance (Bharai): 10 min per 1000 ft of watercourse
    const totalWatercourseFt = Math.max(dist, 5000);
    const totalBharaiMin = (totalWatercourseFt / 1000) * 10;

    // Standard drainage allowance (Nikal) for tail: 2 min per 1000 ft
    const totalNikalMin = (totalWatercourseFt / 1000) * 2;

    // Net available pool of minutes to distribute across CCA
    const netPoolMin = totalWeekMin - totalBharaiMin + totalNikalMin;

    // Baseline minutes per acre
    const minPerAcre = netPoolMin / cca;

    // Farmer's specific Bharai & Nikal
    const farmerBharaiMin = (dist / 1000) * 10;
    const farmerNikalMin = isTailEnd ? (dist / 1000) * 2 : 0;

    // Farmer's total turn in minutes
    const farmerTotalMin = (minPerAcre * myA) + farmerBharaiMin - farmerNikalMin;

    const turnHours = Math.floor(farmerTotalMin / 60);
    const turnMinutes = Math.round(farmerTotalMin % 60);

    const perAcreH = Math.floor(minPerAcre / 60);
    const perAcreM = Math.round(minPerAcre % 60);

    setWarabandiResult({
      cca, myA, dist,
      minPerAcre: minPerAcre.toFixed(1),
      perAcreText: perAcreH > 0 ? `${perAcreH} گھنٹہ ${perAcreM} منٹ` : `${perAcreM} منٹ`,
      farmerTotalMin: farmerTotalMin.toFixed(0),
      totalText: `${turnHours} گھنٹے ${turnMinutes} منٹ`,
      farmerBharaiMin: Math.round(farmerBharaiMin),
      farmerNikalMin: Math.round(farmerNikalMin),
    });
  };

  return (
    <div dir="rtl" style={{ ...nas }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0369a1, #0284c7)', borderRadius: 14, padding: '0.85rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'white' }}>
        <div style={{ fontSize: '1.6rem' }}>💧</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>ٹیوب ویل، سولر، پانی کوالٹی و نہری وارابندی</div>
          <div style={{ color: '#bae6fd', fontSize: '0.72rem', marginTop: 2 }}>
            محکمہ انہار پنجاب (PID) و PCRWR مصدقہ فارمولے
          </div>
        </div>
      </div>

      {/* 4-Way Switcher */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, marginBottom: 12 }}>
        <button onClick={() => setActiveTab('solar')}
          style={{
            padding: '8px 2px', borderRadius: 8,
            border: `2px solid ${activeTab === 'solar' ? '#0284c7' : '#e2e8f0'}`,
            background: activeTab === 'solar' ? '#e0f2fe' : 'white',
            color: activeTab === 'solar' ? '#0369a1' : '#64748b',
            fontWeight: 800, fontSize: '.72rem', cursor: 'pointer', ...nas
          }}
        >
          ⚡ سولر لاگت
        </button>
        <button onClick={() => setActiveTab('water')}
          style={{
            padding: '8px 2px', borderRadius: 8,
            border: `2px solid ${activeTab === 'water' ? '#15803d' : '#e2e8f0'}`,
            background: activeTab === 'water' ? '#dcfce7' : 'white',
            color: activeTab === 'water' ? '#15803d' : '#64748b',
            fontWeight: 800, fontSize: '.72rem', cursor: 'pointer', ...nas
          }}
        >
          🧪 پانی و جپسم
        </button>
        <button onClick={() => setActiveTab('warabandi')}
          style={{
            padding: '8px 2px', borderRadius: 8,
            border: `2px solid ${activeTab === 'warabandi' ? '#1d4ed8' : '#e2e8f0'}`,
            background: activeTab === 'warabandi' ? '#dbeafe' : 'white',
            color: activeTab === 'warabandi' ? '#1d4ed8' : '#64748b',
            fontWeight: 800, fontSize: '.72rem', cursor: 'pointer', ...nas
          }}
        >
          🌊 نہری واری
        </button>
        <button onClick={() => setActiveTab('delta')}
          style={{
            padding: '8px 2px', borderRadius: 8,
            border: `2px solid ${activeTab === 'delta' ? '#d97706' : '#e2e8f0'}`,
            background: activeTab === 'delta' ? '#fef3c7' : 'white',
            color: activeTab === 'delta' ? '#b45309' : '#64748b',
            fontWeight: 800, fontSize: '.72rem', cursor: 'pointer', ...nas
          }}
        >
          📜 فصل ڈیلٹا
        </button>
      </div>

      {/* ── TAB 1: SOLAR & DIESEL COST ── */}
      {activeTab === 'solar' && (
        <div className="form-group">
          <div>
            <label className="input-label" style={{ fontWeight: 700, marginBottom: 4, display: 'block' }}>موٹر / پیٹر انجن ہارس پاور (HP):</label>
            <input type="number" className="input" placeholder="10" value={hp} min="1" max="50" dir="ltr"
              onChange={e => { setHp(e.target.value); setSolarResult(null); }}
              style={{ width: '100%', padding: '.55rem .75rem', borderRadius: 8, border: '1.5px solid #cbd5e1', fontSize: '1rem', fontWeight: 800, fontFamily: 'Inter' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
            <div>
              <label className="input-label" style={{ fontWeight: 700, marginBottom: 4, display: 'block' }}>بور گہرائی (فٹ):</label>
              <input type="number" className="input" placeholder="150" value={depth} min="20" max="600" dir="ltr"
                onChange={e => { setDepth(e.target.value); setSolarResult(null); }}
                style={{ width: '100%', padding: '.55rem .75rem', borderRadius: 8, border: '1.5px solid #cbd5e1', fontSize: '1rem', fontWeight: 800, fontFamily: 'Inter' }}
              />
            </div>
            <div>
              <label className="input-label" style={{ fontWeight: 700, marginBottom: 4, display: 'block' }}>روزانہ چلنے کے گھنٹے:</label>
              <input type="number" className="input" placeholder="6" value={hours} min="1" max="24" dir="ltr"
                onChange={e => { setHours(e.target.value); setSolarResult(null); }}
                style={{ width: '100%', padding: '.55rem .75rem', borderRadius: 8, border: '1.5px solid #cbd5e1', fontSize: '1rem', fontWeight: 800, fontFamily: 'Inter' }}
              />
            </div>
          </div>

          <div style={{ marginTop: 10 }}>
            <label className="input-label" style={{ fontWeight: 700, marginBottom: 4, display: 'block' }}>ڈلیوری پائپ سائز:</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {Object.keys(PIPE_SIZES).map(p => (
                <button key={p} onClick={() => { setPipeSize(p); setSolarResult(null); }}
                  style={{
                    padding: '6px', borderRadius: 8,
                    border: `2px solid ${pipeSize === p ? '#0284c7' : '#e2e8f0'}`,
                    background: pipeSize === p ? '#e0f2fe' : 'white',
                    color: pipeSize === p ? '#0369a1' : '#334155',
                    fontWeight: 800, fontSize: '.78rem', cursor: 'pointer', ...nas
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <button className="btn btn-primary btn-full" id="solar-calc-btn"
            onClick={calculateSolar} disabled={!hp || !hours}
            style={{ width: '100%', marginTop: 12, fontSize: '0.95rem', padding: '0.75rem', background: 'linear-gradient(135deg, #0369a1, #0284c7)', color: 'white', borderRadius: 10, border: 'none', fontWeight: 800, cursor: 'pointer', ...nas }}
          >
            ⚡ سولر موازنہ و بچت حساب لگائیں
          </button>

          {solarResult && (
            <div className="animate-fade-in-up" style={{ marginTop: 14 }}>
              <div style={{ background: 'linear-gradient(135deg, #0c4a6e, #0284c7)', borderRadius: 14, padding: '1rem', color: 'white', marginBottom: 10 }}>
                <div style={{ fontSize: '.88rem', fontWeight: 800, marginBottom: 6 }}>
                  ☀️ سولر سسٹم ({solarResult.solar.kW} kW PV پلیٹس)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '.68rem', opacity: .85 }}>کل لاگت (مارکیٹ)</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 900, fontFamily: 'Inter' }}>₨{fmt(solarResult.solar.totalCost)}</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '.68rem', opacity: .85 }}>67% پنجاب گرانٹ کے بعد</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 900, fontFamily: 'Inter', color: '#fde68a' }}>₨{fmt(solarResult.solar.ownCost)}</div>
                  </div>
                </div>
                <div style={{ marginTop: 8, fontSize: '.72rem', color: '#bae6fd' }}>
                  💡 ڈیزل بچت سے <strong>{solarResult.paybackDiesel} ماہ</strong> میں سسٹم فری ہو جائے گا۔
                  {solarResult.acresPerDay && (
                    <span> • روزانہ سیراب رقبہ: <strong>{solarResult.acresPerDay} ایکڑ</strong> (3 انچ گہرائی)</span>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
                <div style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 10, padding: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '.68rem', color: '#991b1b', fontWeight: 700 }}>ڈیزل خرچ (ماہانہ)</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#dc2626', fontFamily: 'Inter' }}>₨{fmt(solarResult.diesel.monthly)}</div>
                  <div style={{ fontSize: '.65rem', color: '#7f1d1d' }}>{solarResult.diesel.lPerDay} لیٹر فی دن</div>
                </div>
                <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 10, padding: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '.68rem', color: '#92400e', fontWeight: 700 }}>بجلی بل (ماہانہ)</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#b45309', fontFamily: 'Inter' }}>₨{fmt(solarResult.electric.monthly)}</div>
                  <div style={{ fontSize: '.65rem', color: '#78350f' }}>{solarResult.electric.units} یونٹ فی دن</div>
                </div>
              </div>
              <InstitutionalBadge type="pcrwr" helpline="0800-17000" />
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: WATER QUALITY & GYPSUM CALCULATOR ── */}
      {activeTab === 'water' && (
        <div className="form-group">
          <div style={{ fontSize: '.75rem', color: '#475569', marginBottom: 8, lineHeight: 1.5 }}>
            لیب رپورٹ سے ٹیوب ویل پانی کے 3 بنیادی پیرامیٹرز درج کریں (ایگری مال یا SFRI لیب):
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
            <div>
              <label className="input-label" style={{ fontWeight: 700, fontSize: '.72rem', display: 'block', marginBottom: 3 }}>EC (dS/m):</label>
              <input type="number" className="input" placeholder="1.5" value={ec} step="0.1" dir="ltr"
                onChange={e => { setEc(e.target.value); setWaterResult(null); }}
                style={{ width: '100%', padding: '.5rem', borderRadius: 8, border: '1.5px solid #cbd5e1', fontSize: '.9rem', fontWeight: 800, fontFamily: 'Inter' }}
              />
            </div>
            <div>
              <label className="input-label" style={{ fontWeight: 700, fontSize: '.72rem', display: 'block', marginBottom: 3 }}>SAR:</label>
              <input type="number" className="input" placeholder="12" step="0.5" dir="ltr"
                onChange={e => { setSar(e.target.value); setWaterResult(null); }}
                style={{ width: '100%', padding: '.5rem', borderRadius: 8, border: '1.5px solid #cbd5e1', fontSize: '.9rem', fontWeight: 800, fontFamily: 'Inter' }}
              />
            </div>
            <div>
              <label className="input-label" style={{ fontWeight: 700, fontSize: '.72rem', display: 'block', marginBottom: 3 }}>RSC (meq/L):</label>
              <input type="number" className="input" placeholder="2.8" step="0.1" dir="ltr"
                onChange={e => { setRsc(e.target.value); setWaterResult(null); }}
                style={{ width: '100%', padding: '.5rem', borderRadius: 8, border: '1.5px solid #cbd5e1', fontSize: '.9rem', fontWeight: 800, fontFamily: 'Inter' }}
              />
            </div>
          </div>

          <div style={{ marginTop: 10 }}>
            <label className="input-label" style={{ fontWeight: 700, marginBottom: 4, display: 'block' }}>آبپاشی رقبہ (ایکڑ فٹ — ایکڑ ضرب انچ):</label>
            <input type="number" className="input" placeholder="1" value={acreFeet} min="0.5" step="0.5" dir="ltr"
              onChange={e => { setAcreFeet(e.target.value); setWaterResult(null); }}
              style={{ width: '100%', padding: '.55rem .75rem', borderRadius: 8, border: '1.5px solid #cbd5e1', fontSize: '1rem', fontWeight: 800, fontFamily: 'Inter' }}
            />
          </div>

          <button className="btn btn-primary btn-full" id="water-calc-btn"
            onClick={calculateWaterQuality}
            style={{ width: '100%', marginTop: 12, fontSize: '0.95rem', padding: '0.75rem', background: 'linear-gradient(135deg, #15803d, #166534)', color: 'white', borderRadius: 10, border: 'none', fontWeight: 800, cursor: 'pointer', ...nas }}
          >
            💧 پانی کا معیار اور درکار جپسم معلوم کریں
          </button>

          {waterResult && (
            <div className="animate-fade-in-up" style={{ marginTop: 14 }}>
              <div style={{ background: waterResult.statusBg, border: `1.5px solid ${waterResult.statusColor}`, borderRadius: 12, padding: '10px 14px', marginBottom: 10, textAlign: 'center' }}>
                <div style={{ fontWeight: 900, fontSize: '1rem', color: waterResult.statusColor }}>
                  {waterResult.statusLabel}
                </div>
                <div style={{ fontSize: '.72rem', color: '#475569', marginTop: 3 }}>
                  EC: {waterResult.e} dS/m | SAR: {waterResult.s} | RSC: {waterResult.r} meq/L
                </div>
              </div>

              {waterResult.gypsumBags > 0 ? (
                <div style={{ background: 'linear-gradient(135deg, #78350f, #92400e)', borderRadius: 14, padding: '1rem', color: 'white', textAlign: 'center', marginBottom: 10 }}>
                  <div style={{ fontSize: '.78rem', opacity: .9 }}>درکار زرعی جپسم (80-میش باریک پیسا ہوا)</div>
                  <div style={{ fontSize: '2.2rem', fontWeight: 900, fontFamily: 'Inter', marginTop: 2 }}>
                    {waterResult.gypsumBags} بوریاں (50 کلو)
                  </div>
                  <div style={{ fontSize: '.72rem', color: '#fde68a', marginTop: 2 }}>
                    کل وزن: {waterResult.gypsumKg} کلوگرام (باضافی RSC {waterResult.excessRSC} meq/L کو نیوٹرلائز کرنے کیلئے)
                  </div>
                </div>
              ) : (
                <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 10, padding: '10px', textAlign: 'center', marginBottom: 10, color: '#15803d', fontWeight: 800, fontSize: '.85rem' }}>
                  ✅ پانی کا RSC 1.25 سے کم ہے — جپسم ڈالنے کی کوئی ضرورت نہیں ہے۔
                </div>
              )}

              <div style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '10px 14px', fontSize: '.72rem', color: '#334155', lineHeight: 1.6, marginBottom: 10 }}>
                📋 <strong>SFRI و PCRWR گائیڈ لائن برائے کسان:</strong><br />
                1. <strong>طریقہ استعمال:</strong> کھالے (Water Channel) میں جپسم کی بوریوں میں چھوٹے سوراخ کر کے رکھیں تاکہ پانی کے بہاؤ کے ساتھ گھلتا جائے یا کھیت میں بوائی سے پہلے چھٹا دیں۔<br />
                2. <strong>معیار:</strong> جپسم ہمیشہ 80-میش باریک پیسا ہوا خریدیں تاکہ پانی میں فوری حل پذیر ہو۔
              </div>

              <InstitutionalBadge type="sfri" helpline="0800-17000" />
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: CANAL WARABANDI CALCULATOR (Canal & Drainage Act 1873) ── */}
      {activeTab === 'warabandi' && (
        <div className="form-group">
          <div style={{ fontSize: '.75rem', color: '#475569', marginBottom: 8, lineHeight: 1.5 }}>
            محکمہ انہار پنجاب کے تحت کھالے (چک) کی 7 روزہ (168 گھنٹے) قانونی وارابندی کا منصفانہ حساب:
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <label className="input-label" style={{ fontWeight: 700, marginBottom: 4, display: 'block' }}>کل چک کا رقبہ (Total CCA ایکڑ):</label>
              <input type="number" className="input" placeholder="100" value={totalCCA} min="10" dir="ltr"
                onChange={e => { setTotalCCA(e.target.value); setWarabandiResult(null); }}
                style={{ width: '100%', padding: '.55rem .75rem', borderRadius: 8, border: '1.5px solid #cbd5e1', fontSize: '1rem', fontWeight: 800, fontFamily: 'Inter' }}
              />
            </div>
            <div>
              <label className="input-label" style={{ fontWeight: 700, marginBottom: 4, display: 'block' }}>آپ کا رقبہ (ایکڑ میں):</label>
              <input type="number" className="input" placeholder="5" value={myAcres} min="0.5" step="0.5" dir="ltr"
                onChange={e => { setMyAcres(e.target.value); setWarabandiResult(null); }}
                style={{ width: '100%', padding: '.55rem .75rem', borderRadius: 8, border: '1.5px solid #cbd5e1', fontSize: '1rem', fontWeight: 800, fontFamily: 'Inter' }}
              />
            </div>
          </div>

          <div style={{ marginTop: 10 }}>
            <label className="input-label" style={{ fontWeight: 700, marginBottom: 4, display: 'block' }}>موگھے سے آپ کے نکے تک فاصلہ (فٹ میں):</label>
            <input type="number" className="input" placeholder="3000" value={distanceFt} step="500" dir="ltr"
              onChange={e => { setDistanceFt(e.target.value); setWarabandiResult(null); }}
              style={{ width: '100%', padding: '.55rem .75rem', borderRadius: 8, border: '1.5px solid #cbd5e1', fontSize: '1rem', fontWeight: 800, fontFamily: 'Inter' }}
            />
            <div style={{ fontSize: '.68rem', color: '#64748b', marginTop: 2 }}>
              💡 پنجاب انہار معیار: ہر 1,000 فٹ کھالہ بھرائی (Bharai) کیلئے 10 منٹ اضافی الاؤنس ملتا ہے۔
            </div>
          </div>

          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" id="tail-check" checked={isTailEnd} onChange={e => { setIsTailEnd(e.target.checked); setWarabandiResult(null); }} style={{ width: 18, height: 18 }} />
            <label htmlFor="tail-check" style={{ fontSize: '.78rem', fontWeight: 700, color: '#1e293b' }}>
              کیا آپ کی زمین کھالے کی پونچھ (Tail-End) پر واقع ہے؟ (2 منٹ / 1000 فٹ نکال کٹوتی)
            </label>
          </div>

          <button className="btn btn-primary btn-full" id="warabandi-calc-btn"
            onClick={calculateWarabandi}
            style={{ width: '100%', marginTop: 12, fontSize: '0.95rem', padding: '0.75rem', background: 'linear-gradient(135deg, #1d4ed8, #1e40af)', color: 'white', borderRadius: 10, border: 'none', fontWeight: 800, cursor: 'pointer', ...nas }}
          >
            🌊 نہری واری کا قانونی وقت نکالیں
          </button>

          {warabandiResult && (
            <div className="animate-fade-in-up" style={{ marginTop: 14 }}>
              <div style={{ background: 'linear-gradient(135deg, #1e3a8a, #1d4ed8)', borderRadius: 14, padding: '1rem', color: 'white', textAlign: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: '.8rem', opacity: .9 }}>
                  آپ کی نہری واری کا کل قانونی وقت ({warabandiResult.myA} ایکڑ):
                </div>
                <div style={{ fontSize: '2.3rem', fontWeight: 900, fontFamily: 'Inter', marginTop: 2 }} dir="ltr">
                  {warabandiResult.totalText}
                </div>
                <div style={{ fontSize: '.72rem', color: '#bfdbfe', marginTop: 2 }}>
                  فی ایکڑ سرکاری وقت: <strong>{warabandiResult.perAcreText}</strong> ({warabandiResult.minPerAcre} منٹ/ایکڑ)
                </div>
              </div>

              {/* Breakdown */}
              <div style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '10px 14px', marginBottom: 10 }}>
                <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '.82rem', marginBottom: 6 }}>
                  📋 واری وقت کی تفصیل (Sec 68 فارمولا):
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f1f5f9', fontSize: '.75rem' }}>
                  <span style={{ color: '#64748b' }}>بنیادی فصلی وقت ({warabandiResult.myA} ایکڑ):</span>
                  <span style={{ fontWeight: 800, fontFamily: 'Inter' }}>{Math.round(warabandiResult.minPerAcre * warabandiResult.myA)} منٹ</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f1f5f9', fontSize: '.75rem' }}>
                  <span style={{ color: '#15803d' }}>کھالہ بھرائی الاؤنس (+Bharai @ 10m/1000ft):</span>
                  <span style={{ fontWeight: 800, color: '#15803d', fontFamily: 'Inter' }}>+{warabandiResult.farmerBharaiMin} منٹ</span>
                </div>
                {warabandiResult.farmerNikalMin > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f1f5f9', fontSize: '.75rem' }}>
                    <span style={{ color: '#dc2626' }}>پونچھ نکال کٹوتی (-Nikal @ 2m/1000ft):</span>
                    <span style={{ fontWeight: 800, color: '#dc2626', fontFamily: 'Inter' }}>-{warabandiResult.farmerNikalMin} منٹ</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: '1.5px solid #cbd5e1', fontSize: '.85rem', fontWeight: 900, color: '#1d4ed8' }}>
                  <span>کل دورانیہ (گھنٹے و منٹ):</span>
                  <span style={{ fontFamily: 'Inter' }}>{warabandiResult.totalText} ({warabandiResult.farmerTotalMin} منٹ)</span>
                </div>
              </div>

              {/* Legal Law Warning */}
              <div style={{ background: '#fef2f2', border: '1.5px solid #f87171', borderRadius: 10, padding: '10px 12px', fontSize: '.72rem', color: '#991b1b', lineHeight: 1.6 }}>
                ⚖️ <strong>کینال اینڈ ڈرینج ایکٹ 1873 کی اہم دفعات:</strong><br />
                • <strong>دفعہ 68 (پکا وارابندی):</strong> ایس ڈی او یا ایگزیکٹو انجینئر کی منظور شدہ واری قانونی طور پر نافذ العمل ہوتی ہے، کوئی زمیندار وقت کم نہیں کر سکتا۔<br />
                • <strong>دفعہ 70 (پانی چوری):</strong> موگھا توڑنا، پانی کا رخ موڑنا یا مقررہ وقت سے زیادہ پانی لینا جرم ہے جس پر <strong>50,000 روپے تک جرمانہ اور 6 ماہ قید</strong> کی سزا ہو سکتی ہے۔
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: PCRWR CROP WATER DELTA ── */}
      {activeTab === 'delta' && (
        <div>
          <div style={{ fontSize: '.75rem', color: '#475569', marginBottom: 10, lineHeight: 1.5 }}>
            پاکستان کونسل آف ریسرچ ان واٹر ریسورسز (PCRWR) کے مطابق اہم فصلوں کی کل پانی کی ضرورت اور نازک مراحل:
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            {PCRWR_DELTA.map((d, i) => (
              <div key={i} style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '10px 12px', borderRight: '4px solid #0284c7' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 800, color: '#0369a1', fontSize: '.9rem' }}>{d.crop}</div>
                  <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: 10, fontSize: '.7rem', fontWeight: 800, fontFamily: 'Inter' }}>
                    {d.delta} ({d.irrigations})
                  </span>
                </div>
                <div style={{ fontSize: '.7rem', color: '#475569', marginTop: 4 }}>
                  ⚠️ <strong>نازک ترین مراحل (پانی کی کمی سے پیداوار گرتی ہے):</strong> {d.critical}
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px', marginBottom: 12 }}>
            <div style={{ fontWeight: 800, fontSize: '.82rem', color: '#0f172a', marginBottom: 6 }}>
              🗺️ پنجاب ریجنل سولر بور گائیڈ:
            </div>
            {REGIONAL_SOLAR_GUIDE.map((r, i) => (
              <div key={i} style={{ fontSize: '.7rem', color: '#334155', padding: '4px 0', borderBottom: '1px dashed #e2e8f0' }}>
                • <strong>{r.zones}</strong> ({r.depth}): {r.hp} موٹر | {r.pipe} پائپ | ڈسچارج: {r.cfs} | سولر ارے: {r.pv}
              </div>
            ))}
          </div>

          <InstitutionalBadge type="pcrwr" helpline="0800-17000" />
        </div>
      )}
    </div>
  );
}
