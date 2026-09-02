import { useState } from 'react';
import InstitutionalBadge from '../ui/InstitutionalBadge';

// ─── UVAS Lahore & BRI Pattoki 100 kg Wanda Formula ─────────────────────────
const WANDA_RECIPE = [
  { name: 'بنولہ کھل (Cottonseed Cake)', pct: 25, cp: '21-23%', note: 'اعلیٰ پروٹین و قدرتی چکنائی — دودھ کی فیٹ بڑھاتی ہے' },
  { name: 'مکئی کا دلیہ / ٹکڑا (Crushed Maize)', pct: 25, cp: '8-9%', note: 'طاقت و توانائی کا بنیادی ذریعہ (TDN 72-75%)' },
  { name: 'گندم کا چوکر (Wheat Bran)', pct: 20, cp: '14-16%', note: 'ہاضمہ دار ریشہ اور میٹابولک انرجی' },
  { name: 'سرسوں / کینولا کھل (Mustard Cake)', pct: 15, cp: '30-32%', note: 'سستی نباتاتی پروٹین — مقدار 15% سے زیادہ نہ کریں' },
  { name: 'شیرہ / راب (Molasses)', pct: 10, cp: '3-4%', note: 'خوش ذائقہ انرجی — جانور رغبت سے ونڈا کھاتا ہے' },
  { name: 'منرل مکسچر / ڈی سی پی (Mineral Mix)', pct: 2, cp: '—', note: 'کیلشیم، فاسفورس، زنک و آیوڈین (ہڈیوں و دودھ کیلئے)' },
  { name: 'عام نمک (Common Salt)', pct: 1, cp: '—', note: 'سوڈیم اور کلورائیڈ — پیاس اور ہاضمہ بحال رکھتا ہے' },
  { name: 'میٹھا سوڈا (Sodium Bicarbonate)', pct: 0.5, cp: '—', note: 'معدے کی تیزابیت (Acidosis) روکنے کیلئے لازمی بفر' },
  { name: 'ٹاکسن بائنڈر (Toxin Binder)', pct: 0.5, cp: '—', note: 'پھپھوندی کے زہر (Aflatoxin) کا اثر زائل کرتا ہے' },
];

const nas = { fontFamily: '"Noto Nastaliq Urdu", serif', direction: 'rtl' };

export default function LivestockFeedCalc() {
  const [activeTab, setActiveTab] = useState('ration'); // 'ration' | 'recipe' | 'lactometer'

  // Daily Ration State
  const [animalType, setAnimalType] = useState('buffalo'); // 'buffalo' | 'cow' | 'calf' | 'dry' | 'goat' | 'horse' | 'poultry'
  const [milkYield, setMilkYield]   = useState('10'); // Liters
  const [animalWeight, setAnimalWeight] = useState('200'); // kg for calf/fattening
  const [animalCount, setAnimalCount] = useState('5');
  const [rationResult, setRationResult] = useState(null);

  // Wanda Recipe Batch State
  const [batchSize, setBatchSize] = useState(100); // 100, 200, 500, 1000 kg

  // Lactometer Correction State (UVAS / Zeal calibration at 60°F)
  const [observedLR, setObservedLR] = useState('');
  const [milkTempF, setMilkTempF] = useState('');
  const [lactResult, setLactResult] = useState(null);

  const calculateLactometer = () => {
    const lr = parseFloat(observedLR);
    const t = parseFloat(milkTempF);
    if (isNaN(lr) || isNaN(t)) return;
    const correctedLR = +(lr + (t - 60) / 3).toFixed(1);
    const fatPct = +(correctedLR / 4 + 0.5).toFixed(1);
    const fraudDiff = +(correctedLR - lr).toFixed(1);
    setLactResult({ observedLR: lr, correctedLR, fatPct, fraudDiff, milkTempF: t });
  };

  // Calculate Daily Ration
  const calculateRation = () => {
    const count = parseInt(animalCount) || 1;
    const milk = parseFloat(milkYield) || 0;
    const weight = parseFloat(animalWeight) || 200;

    if (animalType === 'poultry') {
      // 110g feed per bird daily (UVAS Poultry Standard)
      const totalGramsPerBird = 110;
      const totalGramsAll = totalGramsPerBird * count;
      const isKg = totalGramsAll >= 1000;

      setRationResult({
        type: 'poultry',
        count,
        isPoultry: true,
        totalFeedDisplay: isKg ? `${(totalGramsAll / 1000).toFixed(2)} کلو` : `${totalGramsAll} گرام`,
        perBird: `${totalGramsPerBird} گرام`,
        grain: isKg ? `${((totalGramsAll * 0.60) / 1000).toFixed(2)} کلو` : `${Math.round(totalGramsAll * 0.60)} گرام`,
        mash: isKg ? `${((totalGramsAll * 0.30) / 1000).toFixed(2)} کلو` : `${Math.round(totalGramsAll * 0.30)} گرام`,
        calcium: isKg ? `${((totalGramsAll * 0.10) / 1000).toFixed(2)} کلو` : `${Math.round(totalGramsAll * 0.10)} گرام`,
      });
      return;
    }

    if (animalType === 'calf') {
      // Growing Calf / Fattening (وزن کے حساب سے): UVAS Fattening Standard
      // Wanda: 1.5% of body weight, Green: 5.5% of body weight, Toori: 1.2% of body weight
      const wandaPerAnimal = weight * 0.015;
      const greenPerAnimal = weight * 0.055;
      const tooriPerAnimal = weight * 0.012;

      setRationResult({
        type: 'calf',
        count,
        weight,
        totalWanda: (wandaPerAnimal * count).toFixed(1),
        greenFodder: (greenPerAnimal * count).toFixed(1),
        silage: (greenPerAnimal * 0.6 * count).toFixed(1),
        dryFodder: (tooriPerAnimal * count).toFixed(1),
        perAnimalWanda: wandaPerAnimal.toFixed(1)
      });
      return;
    }

    if (animalType === 'horse') {
      // Horse / Mule / Draught Equine (400kg working animal standard)
      const wandaPerAnimal = 3.0; // crushed barley, oats, gram
      const greenPerAnimal = 12.0; // lucerne/green grass
      const tooriPerAnimal = 4.5; // wheat straw

      setRationResult({
        type: 'horse',
        count,
        totalWanda: (wandaPerAnimal * count).toFixed(1),
        greenFodder: (greenPerAnimal * count).toFixed(1),
        silage: '—',
        dryFodder: (tooriPerAnimal * count).toFixed(1),
        perAnimalWanda: wandaPerAnimal.toFixed(1)
      });
      return;
    }

    if (animalType === 'goat') {
      const wandaPerAnimal = 0.4 + (milk * 0.3);
      const greenPerAnimal = 4.0;
      setRationResult({
        type: 'goat',
        count,
        totalWanda: (wandaPerAnimal * count).toFixed(1),
        maintenanceWanda: (0.4 * count).toFixed(1),
        productionWanda: (milk * 0.3 * count).toFixed(1),
        greenFodder: (greenPerAnimal * count).toFixed(1),
        silage: (2.0 * count).toFixed(1),
        dryFodder: (1.0 * count).toFixed(1)
      });
      return;
    }

    if (animalType === 'dry') {
      // Dry pregnant
      const wanda = 1.5 * count;
      const green = 25 * count;
      const dry = 6 * count;
      setRationResult({
        type: 'dry',
        count,
        totalWanda: wanda.toFixed(1),
        maintenanceWanda: wanda.toFixed(1),
        productionWanda: '0',
        greenFodder: green.toFixed(0),
        silage: (15 * count).toFixed(0),
        dryFodder: dry.toFixed(0)
      });
      return;
    }

    // Nili-Ravi Buffalo vs Sahiwal Cow (UVAS Standard)
    const isBuffalo = animalType === 'buffalo';
    const maintWanda = (isBuffalo ? 1.8 : 1.2) * count;
    // Production wanda: 480g/L for buffalo (higher fat), 380g/L for cow
    const prodRate = isBuffalo ? 0.48 : 0.38;
    const prodWanda = (milk * prodRate) * count;
    const totalWanda = maintWanda + prodWanda;

    const greenFodder = (isBuffalo ? 30 : 25) * count;
    const silage = (isBuffalo ? 18 : 15) * count;
    const dryFodder = (isBuffalo ? 6 : 5) * count;

    setRationResult({
      type: animalType,
      count,
      milk,
      maintWanda: maintWanda.toFixed(1),
      prodWanda: prodWanda.toFixed(1),
      totalWanda: totalWanda.toFixed(1),
      greenFodder: greenFodder.toFixed(0),
      silage: silage.toFixed(0),
      dryFodder: dryFodder.toFixed(0),
    });
  };

  return (
    <div dir="rtl" style={{ ...nas }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #78350f, #b45309)', borderRadius: 14, padding: '0.85rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'white' }}>
        <div style={{ fontSize: '1.6rem' }}>🥛</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>متوازن لائیوسٹاک راشن و ونڈا کیلکولیٹر</div>
          <div style={{ color: '#fde68a', fontSize: '0.72rem', marginTop: 2 }}>
            UVAS لاہور و بھینس ریسرچ انسٹیٹیوٹ (BRI) پتوکی مصدقہ فارمولیشن
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 12 }}>
        <button
          onClick={() => setActiveTab('ration')}
          style={{
            padding: '8px', borderRadius: 10,
            border: `2px solid ${activeTab === 'ration' ? '#b45309' : '#e2e8f0'}`,
            background: activeTab === 'ration' ? '#fef3c7' : 'white',
            color: activeTab === 'ration' ? '#92400e' : '#64748b',
            fontWeight: 800, fontSize: '.82rem', cursor: 'pointer', ...nas
          }}
        >
          🐄 روزانہ راشن
        </button>
        <button
          onClick={() => setActiveTab('recipe')}
          style={{
            padding: '8px', borderRadius: 10,
            border: `2px solid ${activeTab === 'recipe' ? '#15803d' : '#e2e8f0'}`,
            background: activeTab === 'recipe' ? '#dcfce7' : 'white',
            color: activeTab === 'recipe' ? '#15803d' : '#64748b',
            fontWeight: 800, fontSize: '.82rem', cursor: 'pointer', ...nas
          }}
        >
          🥣 گھریلو ونڈا
        </button>
        <button
          onClick={() => setActiveTab('lactometer')}
          style={{
            padding: '8px', borderRadius: 10,
            border: `2px solid ${activeTab === 'lactometer' ? '#7c3aed' : '#e2e8f0'}`,
            background: activeTab === 'lactometer' ? '#f5f3ff' : 'white',
            color: activeTab === 'lactometer' ? '#7c3aed' : '#64748b',
            fontWeight: 800, fontSize: '.82rem', cursor: 'pointer', ...nas
          }}
        >
          🧪 لیکٹو میٹر
        </button>
      </div>

      {/* ── TAB 1: DAILY RATION CALCULATOR ──────────────────────────────────── */}
      {activeTab === 'ration' && (
        <div className="form-group">
          {/* Animal Category */}
          <div>
            <label className="input-label" style={{ fontWeight: 700, marginBottom: 6, display: 'block' }}>جانور کی قسم منتخب کریں:</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(105px, 1fr))', gap: 6 }}>
              {[
                { id: 'buffalo', label: 'نیلی راوی بھینس', icon: '🐃' },
                { id: 'cow',     label: 'ساہیوال/کراس گائے', icon: '🐄' },
                { id: 'calf',    label: 'بچھڑا / کٹڑا', icon: '🐂' },
                { id: 'dry',     label: 'گابھن / سوکھا', icon: '🤰' },
                { id: 'goat',    label: 'بکری / بھیڑ', icon: '🐐' },
                { id: 'horse',   label: 'گھوڑا / خچر', icon: '🐎' },
                { id: 'poultry', label: 'دیسی مرغی', icon: '🐔' },
              ].map(a => (
                <button key={a.id} id={`feed-type-${a.id}`}
                  onClick={() => { setAnimalType(a.id); setRationResult(null); }}
                  style={{
                    padding: '0.6rem 0.2rem', borderRadius: 8,
                    border: `2px solid ${animalType === a.id ? '#b45309' : '#e5e7eb'}`,
                    background: animalType === a.id ? '#fef3c7' : 'white',
                    color: animalType === a.id ? '#92400e' : '#334155',
                    fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', ...nas
                  }}
                >
                  <div style={{ fontSize: '1.2rem' }}>{a.icon}</div>
                  <div>{a.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Milk Yield (for dairy buffalo/cow/goat) */}
          {(animalType === 'buffalo' || animalType === 'cow' || animalType === 'goat') && (
            <div style={{ marginTop: 10 }}>
              <label className="input-label" style={{ fontWeight: 700, marginBottom: 4, display: 'block' }}>
                روزانہ دودھ کی پیداوار (لیٹر — فی جانور):
              </label>
              <input
                type="number" className="input" placeholder="10"
                value={milkYield} min="0" step="0.5" dir="ltr"
                onChange={e => { setMilkYield(e.target.value); setRationResult(null); }}
                style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: '1rem', fontWeight: 800, fontFamily: 'Inter' }}
              />
              <div style={{ fontSize: '.68rem', color: '#78350f', marginTop: 3 }}>
                {animalType === 'buffalo'
                  ? '💡 نیلی راوی بھینس: فی لیٹر دودھ 480 گرام ونڈا درکار ہوتا ہے (6-7% فیٹ)'
                  : animalType === 'cow'
                  ? '💡 ساہیوال گائے: فی لیٹر دودھ 380 گرام ونڈا درکار ہوتا ہے'
                  : '💡 بکری: فی لیٹر دودھ 300 گرام ونڈا'}
              </div>
            </div>
          )}

          {/* Calf Weight (for growing calf/fattening) */}
          {animalType === 'calf' && (
            <div style={{ marginTop: 10 }}>
              <label className="input-label" style={{ fontWeight: 700, marginBottom: 4, display: 'block' }}>
                بچھڑے / کٹڑے کا اوسط وزن (کلو — فی جانور):
              </label>
              <input
                type="number" className="input" placeholder="200"
                value={animalWeight} min="50" max="600" step="10" dir="ltr"
                onChange={e => { setAnimalWeight(e.target.value); setRationResult(null); }}
                style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: '1rem', fontWeight: 800, fontFamily: 'Inter' }}
              />
              <div style={{ fontSize: '.68rem', color: '#78350f', marginTop: 3 }}>
                💡 گوشت و نشوونما (Fattening): وزن کا 1.5% گروور ونڈا، 5.5% سبز چارہ، اور 1.2% گندم توڑی حساب ہوتا ہے
              </div>
            </div>
          )}

          {/* Animal / Bird Count */}
          <div style={{ marginTop: 10 }}>
            <label className="input-label" style={{ fontWeight: 700, marginBottom: 4, display: 'block' }}>
              {animalType === 'poultry' ? 'مرغیوں / پرندوں کی تعداد:' : 'جانوروں کی تعداد:'}
            </label>
            <input
              type="number" className="input" placeholder="5"
              value={animalCount} min="1" step="1" dir="ltr"
              onChange={e => { setAnimalCount(e.target.value); setRationResult(null); }}
              style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: '1rem', fontWeight: 800, fontFamily: 'Inter' }}
            />
          </div>

          {/* Calculate Button */}
          <button className="btn btn-primary btn-full" id="feed-calc-btn"
            onClick={calculateRation}
            style={{ width: '100%', marginTop: 12, fontSize: '0.95rem', padding: '0.8rem', background: 'linear-gradient(135deg, #78350f, #b45309)', color: 'white', borderRadius: 10, border: 'none', fontWeight: 800, cursor: 'pointer', ...nas }}
          >
            🌾 روزانہ خوراک و راشن حساب لگائیں
          </button>

          {/* ── RESULTS VIEW ── */}
          {rationResult && (
            <div className="animate-fade-in-up" style={{ marginTop: 14 }}>
              
              {/* 🐔 DEDICATED POULTRY VIEW (NO COWS/HORSES FODDER!) */}
              {rationResult.isPoultry ? (
                <div>
                  <div style={{ background: 'linear-gradient(135deg, #065f46, #047857)', borderRadius: 14, padding: '1rem', textAlign: 'center', marginBottom: 10, color: 'white' }}>
                    <div style={{ fontSize: '.8rem', opacity: .9 }}>
                      🐔 کل روزانہ دانا و خوراک ({rationResult.count} مرغیاں)
                    </div>
                    <div style={{ fontSize: '2.4rem', fontWeight: 900, fontFamily: 'Inter', marginTop: 2 }} dir="ltr">
                      {rationResult.totalFeedDisplay}
                    </div>
                    <div style={{ fontSize: '.72rem', color: '#a7f3d0', marginTop: 2 }}>
                      فی پرندہ یومیہ خوراک: <strong>110 گرام</strong> (UVAS پولٹری تجویز)
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 10 }}>
                    <div style={{ background: '#fef3c7', border: '1.5px solid #fde68a', borderRadius: 10, padding: '.65rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '.68rem', color: '#92400e', fontWeight: 700 }}>اناج / دلیہ (60%)</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#78350f', fontFamily: 'Inter', marginTop: 2 }} dir="ltr">
                        {rationResult.grain}
                      </div>
                      <div style={{ fontSize: '.62rem', color: '#b45309' }}>مکئی ٹکڑا، گندم و باجرہ</div>
                    </div>

                    <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 10, padding: '.65rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '.68rem', color: '#1e40af', fontWeight: 700 }}>پروٹین میش (30%)</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#1d4ed8', fontFamily: 'Inter', marginTop: 2 }} dir="ltr">
                        {rationResult.mash}
                      </div>
                      <div style={{ fontSize: '.62rem', color: '#3b82f6' }}>کمرشل فیڈ یا کھل میش</div>
                    </div>

                    <div style={{ background: '#fdf2f8', border: '1.5px solid #fbcfe8', borderRadius: 10, padding: '.65rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '.68rem', color: '#9d174d', fontWeight: 700 }}>کیلشیم گرٹ (10%)</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#be185d', fontFamily: 'Inter', marginTop: 2 }} dir="ltr">
                        {rationResult.calcium}
                      </div>
                      <div style={{ fontSize: '.62rem', color: '#db2777' }}>پسے انڈے چھلکے/سیپ</div>
                    </div>
                  </div>

                  <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '8px 12px', fontSize: '.72rem', color: '#166534', lineHeight: 1.5 }}>
                    💡 <strong>پولٹری ضروری احتیاط:</strong> مرغیوں کے سامنے 24 گھنٹے صاف، تازہ اور ٹھنڈا پانی موجود ہونا چاہیے۔ ہاضمے کیلئے برتن میں تھوڑی باریک بجری رکھیں۔
                  </div>
                </div>
              ) : (
                /* 🐄 RUMINANT & EQUINE VIEW */
                <div>
                  {/* Wanda Box */}
                  <div style={{ background: 'linear-gradient(135deg, #78350f, #92400e)', borderRadius: 14, padding: '1rem', textAlign: 'center', marginBottom: 10, color: 'white' }}>
                    <div style={{ fontSize: '.8rem', opacity: .9 }}>
                      کل روزانہ متوازن ونڈا ({rationResult.count} جانور)
                    </div>
                    <div style={{ fontSize: '2.4rem', fontWeight: 900, fontFamily: 'Inter', marginTop: 2 }} dir="ltr">
                      {rationResult.totalWanda} کلو
                    </div>
                    {rationResult.maintWanda && (
                      <div style={{ fontSize: '.72rem', color: '#fde68a', marginTop: 2 }}>
                        بنیادی زندگی (Maintenance): {rationResult.maintWanda} کلو | دودھ پیداوار (Production): {rationResult.prodWanda} کلو
                      </div>
                    )}
                    {rationResult.perAnimalWanda && (
                      <div style={{ fontSize: '.72rem', color: '#fde68a', marginTop: 2 }}>
                        فی جانور ونڈا: <strong>{rationResult.perAnimalWanda} کلو</strong> روزانہ
                      </div>
                    )}
                  </div>

                  {/* Fodder Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
                    <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 10, padding: '.75rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '.68rem', color: '#166534', fontWeight: 700 }}>سبز چارہ (برسیم / جوار / لوسرن)</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#15803d', fontFamily: 'Inter' }} dir="ltr">
                        {rationResult.greenFodder} کلو
                      </div>
                      {rationResult.silage !== '—' && (
                        <div style={{ fontSize: '.65rem', color: '#16a34a' }}>یا <strong>{rationResult.silage} کلو</strong> مکئی سائیلج</div>
                      )}
                    </div>

                    <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 10, padding: '.75rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '.68rem', color: '#854d0e', fontWeight: 700 }}>خشک چارہ (گندم توڑی)</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#b45309', fontFamily: 'Inter' }} dir="ltr">
                        {rationResult.dryFodder} کلو
                      </div>
                      <div style={{ fontSize: '.65rem', color: '#78350f' }}>ہاضمے اور قدرتی ریشے کیلئے</div>
                    </div>
                  </div>

                  {/* Nutritionist Pro-Tip */}
                  <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 10, padding: '8px 12px', fontSize: '.72rem', color: '#78350f', lineHeight: 1.5 }}>
                    ⚠️ <strong>UVAS لاہور کی اہم نصیحت:</strong> ونڈا ہمیشہ دو برابر حصوں میں صبح اور شام دیں۔ خشک ونڈا یکدم نہ کھلائیں، ہلکا پانی چھڑک کر توڑی یا سائیلج میں مکس کر کے دیں۔ جانور کے سامنے نمک کا ڈھیلا اور صاف پانی ہر وقت رکھیں۔
                  </div>
                </div>
              )}

              {/* WhatsApp Share Button */}
              <button onClick={() => {
                try { localStorage.setItem('dehati_last_ration', JSON.stringify({ type: rationResult.type, count: rationResult.count, ts: Date.now() })); } catch {}
                const lines = rationResult.isPoultry ? [
                  '🐔 *DehatiAI دیسی مرغی خوراک پلان — UVAS مصدقہ*',
                  `پرندوں کی تعداد: ${rationResult.count} مرغیاں`,
                  '━━━━━━━━━━━━━━━━━',
                  `کل روزانہ خوراک: ${rationResult.totalFeedDisplay}`,
                  `• صابوت اناج/دلیہ: ${rationResult.grain}`,
                  `• پروٹین فیڈ/میش: ${rationResult.mash}`,
                  `• کیلشیم چونا/سیپ: ${rationResult.calcium}`,
                  '━━━━━━━━━━━━━━━━━',
                  '📚 ماخذ: UVAS پولٹری ونگ | 📞 مشورہ: 0800-15000',
                ] : [
                  '🐄 *DehatiAI لائیوسٹاک راشن پلان — UVAS/BRI مصدقہ*',
                  `جانور: ${rationResult.type === 'buffalo' ? 'نیلی راوی بھینس' : rationResult.type === 'cow' ? 'ساہیوال/کراس گائے' : rationResult.type === 'calf' ? `بچھڑا (${rationResult.weight} کلو)` : rationResult.type === 'horse' ? 'گھوڑا / خچر' : rationResult.type === 'goat' ? 'بکری' : 'گابھن جانور'} (${rationResult.count} عدد)`,
                  '━━━━━━━━━━━━━━━━━',
                  `روزانہ متوازن ونڈا: ${rationResult.totalWanda} کلو`,
                  `سبز چارہ: ${rationResult.greenFodder} کلو`,
                  `خشک چارہ (گندم توڑی): ${rationResult.dryFodder} کلو`,
                  '━━━━━━━━━━━━━━━━━',
                  '📚 ماخذ: UVAS لاہور + BRI پتوکی | 📞 0800-15000',
                ];
                window.open('https://wa.me/?text=' + encodeURIComponent(lines.join('\n')), '_blank');
              }}
                style={{
                  width: '100%', padding: '10px', borderRadius: 10, border: 'none',
                  background: '#25D366', color: '#fff', fontWeight: 800, fontSize: '0.88rem',
                  cursor: 'pointer', marginTop: 10, direction: 'rtl',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                }}
              >
                📤 راشن پلان واٹس ایپ پر بھیجیں
              </button>

              <div style={{ marginTop: 10 }}>
                <InstitutionalBadge type="uvas" helpline="0800-15000" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: 100 KG HOMEMADE WANDA RECIPE ───────────────────────────────── */}
      {activeTab === 'recipe' && (
        <div className="form-group">
          {/* Batch Multiplier */}
          <div>
            <label className="input-label" style={{ fontWeight: 700, marginBottom: 6, display: 'block' }}>کتنے کلو ونڈا کا نسخہ بنانا چاہتے ہیں؟</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {[100, 200, 500, 1000].map(s => (
                <button key={s} id={`wanda-batch-${s}`}
                  onClick={() => setBatchSize(s)}
                  style={{
                    padding: '0.55rem', borderRadius: 8,
                    border: `2px solid ${batchSize === s ? '#15803d' : '#e5e7eb'}`,
                    background: batchSize === s ? '#f0fdf4' : 'white',
                    color: batchSize === s ? '#15803d' : '#334155',
                    fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'Inter'
                  }}
                >
                  {s} کلو {s === 100 ? '⭐' : ''}
                </button>
              ))}
            </div>
          </div>

          {/* Nutrition Summary Banner */}
          <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 12, padding: '10px 14px', marginTop: 12, marginBottom: 12, display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: '.68rem', color: '#166534' }}>خام پروٹین (Crude Protein)</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#15803d', fontFamily: 'Inter' }}>16 – 18%</div>
            </div>
            <div style={{ borderRight: '1px solid #bbf7d0' }} />
            <div>
              <div style={{ fontSize: '.68rem', color: '#166534' }}>قابلِ ہضم توانائی (TDN)</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#15803d', fontFamily: 'Inter' }}>68 – 72%</div>
            </div>
            <div style={{ borderRight: '1px solid #bbf7d0' }} />
            <div>
              <div style={{ fontSize: '.68rem', color: '#166534' }}>فی لیٹر دودھ فیٹ</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#15803d', fontFamily: 'Inter' }}>6.5% +</div>
            </div>
          </div>

          {/* Ingredients Table */}
          <div style={{ background: 'white', borderRadius: 12, border: '1.5px solid #e2e8f0', overflow: 'hidden', marginBottom: 12 }}>
            <div style={{ background: '#166534', color: 'white', padding: '8px 12px', fontWeight: 800, fontSize: '.85rem' }}>
              🥣 اجزائے ترکیبی برائے {batchSize} کلو ونڈا:
            </div>
            {WANDA_RECIPE.map((ing, idx) => {
              const qty = (ing.pct * batchSize) / 100;
              return (
                <div key={idx} style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: idx % 2 === 0 ? 'white' : '#f8fafc' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '.85rem' }}>
                      {ing.name} ({ing.pct}%)
                    </div>
                    <div style={{ fontSize: '.68rem', color: '#64748b', marginTop: 2 }}>
                      {ing.note}
                    </div>
                  </div>
                  <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 8, padding: '4px 10px', textAlign: 'center', minWidth: 65 }}>
                    <div style={{ fontWeight: 900, fontSize: '1rem', color: '#047857', fontFamily: 'Inter' }} dir="ltr">
                      {qty} کلو
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mixing Instructions */}
          <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 12, padding: '10px 14px', marginBottom: 12 }}>
            <div style={{ fontWeight: 800, color: '#92400e', fontSize: '.82rem', marginBottom: 6 }}>
              📝 ونڈا مکس کرنے کا مستند طریقہ (UVAS گائیڈ لائن):
            </div>
            <div style={{ fontSize: '.72rem', color: '#78350f', lineHeight: 1.6 }}>
              1. پہلے تمام خشک اجزاء (مکئی کا دلیہ، چوکر، کھل بنولہ، کھل سرسوں) کو فرش پر بچھا کر اچھی طرح مکس کریں۔<br />
              2. پھر منرل مکسچر، میٹھا سوڈا اور نمک کو الگ تھوڑے چوکر میں ملا کر پورے ڈھیر پر یکساں چھڑک دیں۔<br />
              3. شیرہ (Molasses) کو آخری مرحلے پر تھوڑے نیم گرم پانی میں ملا کر ونڈے پر چھڑکیں تاکہ تمام دانوں پر خوشبو اور مٹھاس چڑھ جائے۔<br />
              4. تیار شدہ ونڈا خشک ہوادار بوریوں میں رکھیں اور نمی سے بچائیں۔
            </div>
          </div>

          <InstitutionalBadge type="uvas" helpline="0800-15000" />
        </div>
      )}

      {/* ── TAB 3: LACTOMETER TEMPERATURE CORRECTION ──────────────────────────── */}
      {activeTab === 'lactometer' && (
        <div className="form-group">
          {/* Header explanation */}
          <div style={{ background: '#f5f3ff', border: '1.5px solid #c4b5fd', borderRadius: 12, padding: '10px 14px', marginBottom: 12 }}>
            <div style={{ fontWeight: 800, color: '#6d28d9', fontSize: '.85rem', marginBottom: 4 }}>
              🧪 لیکٹو میٹر درجہ حرارت کریکشن — ڈوڈھیوں کی بے ایمانی سے بچیں!
            </div>
            <div style={{ fontSize: '.7rem', color: '#5b21b6', lineHeight: 1.6 }}>
              <strong>مسئلہ:</strong> ذیل لیکٹو میٹر (Zeal) 60°F (15.5°C) پر کیلیبریٹ ہوتا ہے۔ گرم موسم میں تازہ دودھ 95–100°F ہوتا ہے۔ ہر 3°F درجہ حرارت بڑھنے پر CLR 1 درجہ کم دکھاتا ہے — اس طرح ڈوڈھی کم قیمت ادا کرتا ہے۔<br />
              <strong>فارمولہ (UVAS لاہور):</strong> درست CLR = دیکھا ہوا LR + ((درجہ حرارت°F - 60) ÷ 3)
            </div>
          </div>

          {/* Inputs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div>
              <label style={{ fontWeight: 700, fontSize: '.78rem', display: 'block', marginBottom: 4, color: '#374151' }}>
                لیکٹو میٹر کی ریڈنگ (LR):
              </label>
              <input
                type="number" placeholder="مثلاً: 26" dir="ltr"
                value={observedLR}
                onChange={e => { setObservedLR(e.target.value); setLactResult(null); }}
                style={{ width: '100%', padding: '0.6rem 0.7rem', borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: '1rem', fontWeight: 800, fontFamily: 'Inter' }}
              />
              <div style={{ fontSize: '.65rem', color: '#6b7280', marginTop: 2 }}>نارمل بھینس دودھ: 26–32</div>
            </div>
            <div>
              <label style={{ fontWeight: 700, fontSize: '.78rem', display: 'block', marginBottom: 4, color: '#374151' }}>
                دودھ کا درجہ حرارت (°F):
              </label>
              <input
                type="number" placeholder="مثلاً: 95" dir="ltr"
                value={milkTempF}
                onChange={e => { setMilkTempF(e.target.value); setLactResult(null); }}
                style={{ width: '100%', padding: '0.6rem 0.7rem', borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: '1rem', fontWeight: 800, fontFamily: 'Inter' }}
              />
              <div style={{ fontSize: '.65rem', color: '#6b7280', marginTop: 2 }}>گرمی میں تازہ دودھ: 90–100°F</div>
            </div>
          </div>

          <button
            onClick={calculateLactometer}
            style={{ width: '100%', padding: '0.8rem', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #6d28d9, #7c3aed)', color: 'white', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', marginBottom: 12, ...nas }}
          >
            🧪 درست CLR اور فیٹ حساب لگائیں
          </button>

          {/* Result */}
          {lactResult && (
            <div className="animate-fade-in-up">
              {/* Corrected CLR banner */}
              <div style={{ background: 'linear-gradient(135deg, #6d28d9, #7c3aed)', borderRadius: 14, padding: '1rem', textAlign: 'center', marginBottom: 10, color: 'white' }}>
                <div style={{ fontSize: '.8rem', opacity: .9 }}>درست لیکٹو میٹر ریڈنگ (Corrected CLR)</div>
                <div style={{ fontSize: '2.8rem', fontWeight: 900, fontFamily: 'Inter', marginTop: 2 }} dir="ltr">
                  {lactResult.correctedLR}
                </div>
                <div style={{ fontSize: '.75rem', color: '#ddd6fe', marginTop: 2 }}>
                  مشاہدہ شدہ: {lactResult.observedLR} → درست: {lactResult.correctedLR} (فرق: +{lactResult.fraudDiff})
                </div>
              </div>

              {/* Fraud alert if significant difference */}
              {lactResult.fraudDiff >= 2 && (
                <div style={{ background: '#fef2f2', border: '2px solid #ef4444', borderRadius: 12, padding: '10px 14px', marginBottom: 10 }}>
                  <div style={{ fontWeight: 800, color: '#b91c1c', fontSize: '.82rem', marginBottom: 4 }}>
                    ⚠️ ممکنہ دھوکہ دہی — ڈوڈھی کو فوری بتائیں!
                  </div>
                  <div style={{ fontSize: '.7rem', color: '#991b1b', lineHeight: 1.6 }}>
                    آپ کا دودھ {lactResult.milkTempF}°F گرم تھا۔ درجہ حرارت کی وجہ سے CLR {lactResult.fraudDiff} درجے کم دکھ رہا تھا۔ اگر ڈوڈھی نے کریکشن کے بغیر قیمت دی تو آپ کو نقصان ہوا۔
                    <br /><strong>مطالبہ کریں: ٹھنڈا دودھ یا درست CLR {lactResult.correctedLR} کے حساب سے قیمت۔</strong>
                  </div>
                </div>
              )}

              {/* Fat % and quality */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 10, padding: '0.75rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '.68rem', color: '#166534', fontWeight: 700 }}>تخمینہ فیٹ فیصد</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#15803d', fontFamily: 'Inter' }} dir="ltr">
                    {lactResult.fatPct}%
                  </div>
                  <div style={{ fontSize: '.62rem', color: '#16a34a' }}>بھینس معیار: 6%+</div>
                </div>
                <div style={{ background: '#faf5ff', border: '1.5px solid #c4b5fd', borderRadius: 10, padding: '0.75rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '.68rem', color: '#6d28d9', fontWeight: 700 }}>کریکشن فیکٹر</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#7c3aed', fontFamily: 'Inter' }} dir="ltr">
                    +{lactResult.fraudDiff}
                  </div>
                  <div style={{ fontSize: '.62rem', color: '#6d28d9' }}>CLR اضافہ</div>
                </div>
              </div>

              {/* Instructions */}
              <div style={{ background: '#fffbeb', border: '1px solid #f59e0b', borderRadius: 10, padding: '8px 12px', fontSize: '.7rem', color: '#78350f', lineHeight: 1.5 }}>
                💡 <strong>صحیح طریقہ:</strong> دوہنے کے فوری بعد دودھ کا نمونہ ٹھنڈا پانی میں رکھیں اور 60°F (15°C) پر ٹھنڈا کر کے پڑھیں۔ یا یہ کیلکولیٹر استعمال کریں۔ L&DD پنجاب ہیلپ لائن: 0800-17000
              </div>
            </div>
          )}

          {/* Reference table */}
          <div style={{ marginTop: 12, background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ background: '#7c3aed', color: 'white', padding: '6px 12px', fontWeight: 800, fontSize: '.78rem' }}>
              📊 حوالہ جاتی CLR جدول (UVAS لاہور / Zeal Lactometer)
            </div>
            {[
              { lr: '28–30', fat: '7.5–8%', quality: '⭐⭐⭐ اعلیٰ', color: '#f0fdf4' },
              { lr: '26–28', fat: '7–7.5%', quality: '⭐⭐ اچھا', color: 'white' },
              { lr: '24–26', fat: '6.5–7%', quality: '⭐ قابل قبول', color: '#f0fdf4' },
              { lr: '22–24', fat: '6–6.5%', quality: '⚠️ کمزور', color: 'white' },
              { lr: '18 سے کم', fat: '5% سے کم', quality: '⛔ ملاوٹ / پانی', color: '#fef2f2' },
            ].map((row, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', padding: '6px 12px', background: row.color, borderBottom: '1px solid #f1f5f9', fontSize: '.7rem' }}>
                <div style={{ fontWeight: 800, fontFamily: 'Inter' }} dir="ltr">CLR: {row.lr}</div>
                <div style={{ color: '#15803d', fontWeight: 700 }} dir="ltr">{row.fat}</div>
                <div style={{ ...nas }}>{row.quality}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
