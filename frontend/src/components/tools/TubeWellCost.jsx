import { useState } from 'react';

// ─── Solar/Electric/Diesel calculation engine ─────────────────────────────────
// Based on AEDB, NEPRA, and Punjab Irrigation Dept standards

const PIPE_SIZES = {
  '3 انچ':  { gpmPerHP: 18, label: '3"' },
  '4 انچ':  { gpmPerHP: 28, label: '4"' },
  '5 انچ':  { gpmPerHP: 40, label: '5"' },
  '6 انچ':  { gpmPerHP: 55, label: '6"' },
};

// Solar kW sizing lookup (HP to kW with depth factor)
const getSolarKW = (hp, depth) => {
  const baseKW = hp * 0.746;
  const depthFactor = depth > 100 ? 1.3 : depth > 60 ? 1.15 : 1.0;
  return Math.ceil(baseKW * depthFactor * 1.25); // 25% buffer
};

// Punjab Govt Solar Subsidy 2024-25 (AEDB registered installers)
const SOLAR_SUBSIDY_STEPS = [
  '1. AEDB ویب سائٹ (aedb.org.pk) پر رجسٹرڈ انسٹالر تلاش کریں',
  '2. وزارت توانائی سبسیڈی فارم پُر کریں (60-80% سبسیڈی دستیاب)',
  '3. محکمہ زراعت پنجاب سے NOC لیں',
  '4. قریبی LESCO/FESCO آفس میں بجلی کنکشن چیک کریں',
  '5. PM کسان پیکیج: مفت نیٹ میٹرنگ اور 3 سال وارنٹی',
  '6. ہیلپ لائن: 0800-SOLAR (76527) — مفت',
];

const DISCLAIMER = '⚠️ یہ تجاویز زرعی تحقیقاتی ڈیٹا پر مبنی ہیں۔ حتمی فیصلے سے قبل مقامی زراعت آفیسر سے مشورہ کریں۔';
const nas = { fontFamily: '"Noto Nastaliq Urdu", serif', direction: 'rtl' };


// ─── PCRWR (Pakistan Council of Research in Water Resources) Crop Water Delta ──
const PCRWR_DELTA = [
  { crop: 'گندم (Wheat)', delta: '14–18 ایکڑ انچ', irrigations: '4–6 پانی', critical: 'تاج جڑیں (21–25 دن)، شگوفے (40–45 دن)، بالیاں نکلنا' },
  { crop: 'کپاس (Cotton)', delta: '22–28 ایکڑ انچ', irrigations: '4–7 پانی', critical: 'گڈی بننا (40–45 دن)، پھول آنا، ٹینڈا بننا' },
  { crop: 'چاول باسمتی (Rice)', delta: '55–65 ایکڑ انچ', irrigations: '10–14 پانی', critical: 'پنیری منتقلی، گوب کی حالت (40–45 دن)، پھول آنا' },
  { crop: 'کماد / گنا (Sugarcane)', delta: '55–65 ایکڑ انچ', irrigations: '8–12 پانی', critical: 'شگوفے (30 دن)، تیز نشوونما (90–120 دن)' },
];

// PCRWR Regional Solar Depth Guidelines for Punjab
const REGIONAL_SOLAR_GUIDE = [
  { depth: '100–150 فٹ', hp: '5–7.5 HP', pipe: '3–4 انچ', cfs: '0.25–0.35 کیوسک', pv: '6–8 kWp', zones: 'ملتان، وہاڑی، لودھراں' },
  { depth: '150–250 فٹ', hp: '7.5–10 HP', pipe: '4 انچ', cfs: '0.30–0.40 کیوسک', pv: '9–11 kWp', zones: 'ساہیوال، فیصل آباد، خانیوال' },
  { depth: '250–350 فٹ', hp: '10–15 HP', pipe: '4–6 انچ', cfs: '0.35–0.50 کیوسک', pv: '12–16 kWp', zones: 'بہاولپور، رحیم یار خان' },
];

export default function TubeWellCost() {
  const [hp, setHp] = useState('');
  const [depth, setDepth] = useState('');
  const [pipeSize, setPipeSize] = useState('4 انچ');
  const [hours, setHours] = useState('');
  const [result, setResult] = useState(null);

  const calculate = () => {
    const h = parseFloat(hp);
    const d = parseFloat(depth);
    const hrs = parseFloat(hours);
    if (!h || !hrs || h <= 0 || hrs <= 0) return;

    // ── Diesel ──────────────────────────────────────────────────────
    const dieselLPerHr = h * 0.25;          // standard: 0.25 L per HP per hr
    const dieselPricePerL = 310;            // PKR/L (2024-25)
    const dieselDailyCost = dieselLPerHr * hrs * dieselPricePerL;
    const dieselMonthlyCost = dieselDailyCost * 30;

    // ── Electric ─────────────────────────────────────────────────────
    const kW = h * 0.746;
    const unitsPerDay = kW * hrs;
    const electricRate = 42;                // PKR/unit agricultural tariff
    const electricDailyCost = unitsPerDay * electricRate;
    const electricMonthlyCost = electricDailyCost * 30;

    // ── Solar ────────────────────────────────────────────────────────
    const solarKW = getSolarKW(h, d || 50);
    const solarInstallCostPerKW = 75000;     // PKR/kW installed (2024-25)
    const totalSolarCost = solarKW * solarInstallCostPerKW;
    const subsidyPct = 0.60;               // 60% Punjab/Federal subsidy
    const solarOwnCost = totalSolarCost * (1 - subsidyPct);

    // Payback vs diesel
    const monthlySavingsDiesel = dieselMonthlyCost;
    const paybackMonthsDiesel = monthlySavingsDiesel > 0 ? Math.ceil(solarOwnCost / monthlySavingsDiesel) : 0;
    const paybackMonthsElectric = electricMonthlyCost > 0 ? Math.ceil(solarOwnCost / electricMonthlyCost) : 0;

    // Flow rate
    const pipeData = PIPE_SIZES[pipeSize];
    const gpm = pipeData ? pipeData.gpmPerHP * h : null;
    const acresPerDay = gpm ? Math.round((gpm * hrs * 60) / 27154) : null; // 1 acre-inch ≈ 27,154 gallons

    setResult({
      hp: h, hrs, depth: d, pipeSize,
      diesel: { daily: Math.round(dieselDailyCost), monthly: Math.round(dieselMonthlyCost), lPerDay: Math.round(dieselLPerHr * hrs) },
      electric: { daily: Math.round(electricDailyCost), monthly: Math.round(electricMonthlyCost), units: Math.round(unitsPerDay) },
      solar: { kW: solarKW, totalCost: Math.round(totalSolarCost), ownCost: Math.round(solarOwnCost), monthly: 0 },
      paybackDiesel: paybackMonthsDiesel,
      paybackElectric: paybackMonthsElectric,
      acresPerDay,
    });
  };

  const fmt = n => n.toLocaleString('ur-PK');

  return (
    <div dir="rtl" style={{ ...nas }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #713f12, #ca8a04)', borderRadius: 12, padding: '0.85rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <div style={{ fontSize: '1.6rem' }}>☀️</div>
        <div>
          <div style={{ color: 'white', fontWeight: 800, fontSize: '0.95rem' }}>سولر بمقابلہ ڈیزل بمقابلہ بجلی</div>
          <div style={{ color: '#fef3c7', fontSize: '0.72rem', marginTop: 2 }}>ٹیوب ویل لاگت + واپسی مدت + سرکاری سبسیڈی</div>
        </div>
      </div>

      <div className="form-group">
        {/* HP */}
        <div>
          <label className="input-label">موٹر کی طاقت (HP)</label>
          <input id="tw-hp" type="number" className="input input-number" placeholder="10 HP" value={hp} min="1" max="75" dir="ltr" onChange={e => { setHp(e.target.value); setResult(null); }} />
        </div>

        {/* Bore Depth */}
        <div>
          <label className="input-label">بور کی گہرائی (فٹ)</label>
          <input id="tw-depth" type="number" className="input input-number" placeholder="60 فٹ" value={depth} min="10" dir="ltr" onChange={e => { setDepth(e.target.value); setResult(null); }} />
        </div>

        {/* Pipe Size */}
        <div>
          <label className="input-label">ڈیلیوری پائپ کا سائز</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
            {Object.keys(PIPE_SIZES).map(s => (
              <button key={s} id={`tw-pipe-${s}`}
                onClick={() => { setPipeSize(s); setResult(null); }}
                style={{ padding: '0.6rem 0.3rem', borderRadius: 8, border: `2px solid ${pipeSize === s ? '#ca8a04' : '#e5e7eb'}`, background: pipeSize === s ? '#fffbeb' : 'white', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', color: '#1a2f0e', ...nas }}
              >{s}</button>
            ))}
          </div>
        </div>

        {/* Daily Hours */}
        <div>
          <label className="input-label">روزانہ چلانے کے گھنٹے</label>
          <input id="tw-hours" type="number" className="input input-number" placeholder="6 گھنٹے" value={hours} min="0.5" max="24" step="0.5" dir="ltr" onChange={e => { setHours(e.target.value); setResult(null); }} />
        </div>

        <button className="btn btn-primary btn-full" id="tw-calc-btn"
          disabled={!hp || !hours}
          onClick={calculate}
          style={{ background: 'linear-gradient(135deg, #713f12, #ca8a04)', fontSize: '1rem', padding: '0.85rem', ...nas }}
        >
          ☀️ لاگت موازنہ اور سبسیڈی دیکھیں
        </button>

        {/* Results */}
        {result && (
          <div className="animate-fade-in-up">
            {/* 3-column comparison */}
            <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#713f12', marginBottom: 8, ...nas }}>
              ماہانہ لاگت کا موازنہ
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 12 }}>
              {/* Diesel */}
              <div style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 12, padding: '0.7rem 0.5rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.4rem' }}>🛢️</div>
                <div style={{ fontWeight: 800, fontSize: '0.7rem', color: '#dc2626', ...nas }}>ڈیزل</div>
                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#dc2626', fontFamily: 'Inter', marginTop: 4 }} dir="ltr">
                  ₨{fmt(result.diesel.monthly)}
                </div>
                <div style={{ fontSize: '0.6rem', color: '#9ca3af', marginTop: 2, ...nas }}>/ مہینہ</div>
                <div style={{ fontSize: '0.6rem', color: '#dc2626', marginTop: 4, ...nas }}>{result.diesel.lPerDay}L/ دن</div>
              </div>

              {/* Electric */}
              <div style={{ background: '#eff6ff', border: '1.5px solid #93c5fd', borderRadius: 12, padding: '0.7rem 0.5rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.4rem' }}>⚡</div>
                <div style={{ fontWeight: 800, fontSize: '0.7rem', color: '#1d4ed8', ...nas }}>بجلی</div>
                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#1d4ed8', fontFamily: 'Inter', marginTop: 4 }} dir="ltr">
                  ₨{fmt(result.electric.monthly)}
                </div>
                <div style={{ fontSize: '0.6rem', color: '#9ca3af', marginTop: 2, ...nas }}>/ مہینہ</div>
                <div style={{ fontSize: '0.6rem', color: '#1d4ed8', marginTop: 4, ...nas }}>{result.electric.units} یونٹ/ دن</div>
              </div>

              {/* Solar */}
              <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 12, padding: '0.7rem 0.5rem', textAlign: 'center', position: 'relative' }}>
                <div style={{ position: 'absolute', top: -8, right: '50%', transform: 'translateX(50%)', background: '#15803d', color: 'white', fontSize: '0.6rem', fontWeight: 800, padding: '0.15rem 0.45rem', borderRadius: 20, ...nas, whiteSpace: 'nowrap' }}>بہترین انتخاب</div>
                <div style={{ fontSize: '1.4rem' }}>☀️</div>
                <div style={{ fontWeight: 800, fontSize: '0.7rem', color: '#ca8a04', ...nas }}>سولر</div>
                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#15803d', fontFamily: 'Inter', marginTop: 4 }}>₨0</div>
                <div style={{ fontSize: '0.6rem', color: '#9ca3af', marginTop: 2, ...nas }}>/ مہینہ</div>
                <div style={{ fontSize: '0.6rem', color: '#15803d', marginTop: 4, ...nas }}>{result.solar.kW} kW سسٹم</div>
              </div>
            </div>

            {/* Solar Investment */}
            <div style={{ background: 'linear-gradient(135deg, #713f12, #ca8a04)', borderRadius: 14, padding: '1rem', marginBottom: 12 }}>
              <div style={{ color: 'white', fontWeight: 800, fontSize: '0.88rem', marginBottom: 8, ...nas }}>
                ☀️ سولر سسٹم سرمایہ کاری ({result.solar.kW} kW)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { label: 'کل لاگت', value: `₨${fmt(result.solar.totalCost)}`, sub: 'سبسیڈی سے پہلے' },
                  { label: '60% سبسیڈی کے بعد', value: `₨${fmt(result.solar.ownCost)}`, sub: 'آپ کی جیب سے' },
                  { label: 'ڈیزل واپسی مدت', value: `${result.paybackDiesel} ماہ`, sub: 'ڈیزل بچت سے' },
                  { label: 'بجلی واپسی مدت', value: `${result.paybackElectric} ماہ`, sub: 'بجلی بچت سے' },
                ].map(({ label, value, sub }) => (
                  <div key={label} style={{ background: 'rgba(255,255,255,.15)', borderRadius: 10, padding: '0.6rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,.8)', ...nas }}>{label}</div>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: 'white', fontFamily: 'Inter', marginTop: 2 }} dir="ltr">{value}</div>
                    <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,.7)', ...nas }}>{sub}</div>
                  </div>
                ))}
              </div>
              {result.paybackDiesel > 0 && (
                <div style={{ marginTop: 10, background: 'rgba(255,255,255,.2)', borderRadius: 8, padding: '0.55rem 0.7rem', fontSize: '0.75rem', color: 'white', fontWeight: 700, ...nas }}>
                  💡 {result.paybackDiesel} ماہ میں ڈیزل کی بچت سے سسٹم فری ہو جائے گا!
                </div>
              )}
            </div>

            {/* Flow Rate */}
            {result.acresPerDay && (
              <div style={{ background: '#eff6ff', border: '1.5px solid #93c5fd', borderRadius: 12, padding: '0.75rem', marginBottom: 8, textAlign: 'center' }}>
                <div style={{ fontSize: '0.72rem', color: '#1d4ed8', ...nas }}>💧 روزانہ آبپاشی صلاحیت ({result.pipeSize} پائپ)</div>
                <div style={{ fontWeight: 800, fontSize: '1.6rem', color: '#1d4ed8', fontFamily: 'Inter' }}>~{result.acresPerDay}</div>
                <div style={{ fontSize: '0.68rem', color: '#6b7280', ...nas }}>ایکڑ / دن (6 انچ پانی)</div>
              </div>
            )}

            {/* Subsidy Steps */}
            <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 12, padding: '0.85rem', marginBottom: 8 }}>
              <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#14532d', marginBottom: 8, ...nas }}>
                🏛️ پنجاب سولر سبسیڈی — اقدامات:
              </div>
              {SOLAR_SUBSIDY_STEPS.map((step, i) => (
                <div key={i} style={{ fontSize: '0.72rem', color: '#166534', marginBottom: 4, ...nas }}>{step}</div>
              ))}
            </div>

            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '0.65rem 0.8rem', fontSize: '0.72rem', color: '#92400e', ...nas }}>
              {DISCLAIMER}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
