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

// ─── UVAS / BRI Pattoki Available Fodder Nutrition Profiles ────────────────
const FODDER_TYPES = [
  { id: 'berseem', label: '🌿 برسیم / لوسرن (سبز ہائی پروٹین 18-20% CP)', offset: -0.5, green: 35, toori: 4, silage: 10, note: 'اعلیٰ پروٹین کی وجہ سے ونڈا 0.5 کلو کم لگتا ہے (پیسوں کی بچت)' },
  { id: 'silage',  label: '🌽 مکئی سائیلج (اعلیٰ انرجی TDN 70%)',        offset: -0.3, green: 10, toori: 3, silage: 22, note: 'اعلیٰ انرجی کی وجہ سے توڑی کی ضرورت کم اور 0.3 کلو ونڈا بچاتا ہے' },
  { id: 'sorghum', label: '🌾 جوار / باجرہ / روڈس (موسم گرما چارہ 8-10% CP)', offset: 0.0,  green: 30, toori: 6, silage: 18, note: 'روایتی گرمیوں کا متوازن چارہ — معیاری ونڈا ضرورت' },
  { id: 'dry_only',label: '🍂 صرف گندم توڑی / کڑب (شدید پروٹین کمی 3-4% CP)', offset: 0.8,  green: 5,  toori: 9, silage: 0,  note: '⚠️ سبز چارے کی کمی! پروٹین خسارہ پورا کرنے کیلئے 0.8 کلو اضافی ونڈا درکار ہے' },
];

export default function LivestockFeedCalc() {
  const [activeTab, setActiveTab] = useState('ration'); // 'ration' | 'recipe' | 'lactometer'

  // Daily Ration State
  const [animalType, setAnimalType]     = useState('buffalo'); // 'buffalo' | 'cow' | 'calf' | 'dry' | 'goat' | 'horse' | 'poultry'
  const [animalWeight, setAnimalWeight] = useState('550'); // kg live weight
  const [milkYield, setMilkYield]       = useState('10');  // Liters
  const [fodderType, setFodderType]     = useState('berseem'); // fodder profile
  const [animalCount, setAnimalCount]   = useState('1');
  const [rationResult, setRationResult] = useState(null);

  // Wanda Recipe Batch State
  const [batchSize, setBatchSize] = useState(100); // 100, 200, 500, 1000 kg

  // Lactometer Correction State (UVAS / Zeal calibration at 60°F)
  const [observedLR, setObservedLR] = useState('');
  const [milkTempF, setMilkTempF]   = useState('');
  const [lactResult, setLactResult] = useState(null);

  // Switch animal defaults dynamically
  const handleAnimalChange = (type) => {
    setAnimalType(type);
    setRationResult(null);
    if (type === 'buffalo') { setAnimalWeight('550'); setMilkYield('10'); }
    else if (type === 'cow') { setAnimalWeight('400'); setMilkYield('12'); }
    else if (type === 'calf') { setAnimalWeight('200'); setMilkYield('0'); }
    else if (type === 'dry') { setAnimalWeight('500'); setMilkYield('0'); }
    else if (type === 'goat') { setAnimalWeight('45'); setMilkYield('2'); }
    else if (type === 'horse') { setAnimalWeight('400'); setMilkYield('0'); }
    else if (type === 'poultry') { setAnimalWeight('1.8'); setMilkYield('0'); setAnimalCount('50'); }
  };

  const calculateLactometer = () => {
    const lr = parseFloat(observedLR);
    const t = parseFloat(milkTempF);
    if (isNaN(lr) || isNaN(t)) return;
    const correctedLR = +(lr + (t - 60) / 3).toFixed(1);
    const fraudDiff = +(correctedLR - lr).toFixed(1);
    const specificGravity = +(1 + correctedLR / 1000).toFixed(3);

    // Standard pure milk CLR baseline (UVAS standard: 30 for Buffalo, 28 for Cow)
    const stdCLR = animalType === 'cow' ? 28 : 30;
    const waterAdulterationPct = correctedLR < stdCLR
      ? Math.min(100, Math.max(0, +(((stdCLR - correctedLR) / stdCLR) * 100).toFixed(1)))
      : 0;

    // Richmond Formula Solids-Not-Fat (SNF) base: CLR/4 + 0.5
    const snfPct = +(correctedLR / 4 + 0.5).toFixed(1);

    // Realistic fat estimation based on dairy species baseline
    const estimatedFatPct = +(Math.max(2.5, (correctedLR >= 28 ? (animalType === 'cow' ? 3.8 + (correctedLR - 28) * 0.15 : 6.2 + (correctedLR - 30) * 0.2) : 3.2))).toFixed(1);

    setLactResult({
      observedLR: lr,
      correctedLR,
      fraudDiff,
      milkTempF: t,
      specificGravity,
      waterAdulterationPct,
      snfPct,
      estimatedFatPct
    });
  };

  // Calculate Daily Ration with UVAS Scientific Precision
  const calculateRation = () => {
    const count = Math.max(1, parseInt(animalCount) || 1);
    const milk = Math.max(0, parseFloat(milkYield) || 0);
    const weight = Math.max(10, parseFloat(animalWeight) || (animalType === 'buffalo' ? 550 : 400));
    const fodder = FODDER_TYPES.find(f => f.id === fodderType) || FODDER_TYPES[0];

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
      // Growing Calf / Fattening: UVAS Fattening Standard (1.5% wanda, 5.5% green, 1.2% toori)
      const wandaPerAnimal = +(weight * 0.015).toFixed(2);
      const greenPerAnimal = +(weight * 0.055).toFixed(1);
      const tooriPerAnimal = +(weight * 0.012).toFixed(1);

      setRationResult({
        type: 'calf',
        count,
        weight,
        totalWanda: (wandaPerAnimal * count).toFixed(1),
        perAnimalWanda: wandaPerAnimal.toFixed(2),
        maintWanda: wandaPerAnimal.toFixed(2),
        prodWanda: '0',
        fodderOffset: 0,
        fodderNote: 'بچھڑے کا روزانہ ونڈا کل جسمانی وزن کا 1.5% مقرر ہے',
        greenFodder: (greenPerAnimal * count).toFixed(0),
        silage: ((greenPerAnimal * 0.6) * count).toFixed(0),
        dryFodder: (tooriPerAnimal * count).toFixed(1),
        morningWanda: ((wandaPerAnimal * count) / 2).toFixed(1),
        eveningWanda: ((wandaPerAnimal * count) / 2).toFixed(1),
        waterRequirement: Math.round(weight * 0.10 * count),
      });
      return;
    }

    if (animalType === 'horse') {
      const wandaPerAnimal = 3.0;
      const greenPerAnimal = 12.0;
      const tooriPerAnimal = 4.5;

      setRationResult({
        type: 'horse',
        count,
        weight,
        totalWanda: (wandaPerAnimal * count).toFixed(1),
        perAnimalWanda: wandaPerAnimal.toFixed(1),
        maintWanda: wandaPerAnimal.toFixed(1),
        prodWanda: '0',
        fodderOffset: 0,
        fodderNote: 'محنتی گھوڑے / خچر کیلئے معیاری اناج و ونڈا خوراک',
        greenFodder: (greenPerAnimal * count).toFixed(0),
        silage: '—',
        dryFodder: (tooriPerAnimal * count).toFixed(1),
        morningWanda: ((wandaPerAnimal * count) / 2).toFixed(1),
        eveningWanda: ((wandaPerAnimal * count) / 2).toFixed(1),
        waterRequirement: Math.round(weight * 0.09 * count),
      });
      return;
    }

    if (animalType === 'goat') {
      const maintPerAnimal = +((weight / 45) * 0.4).toFixed(2);
      const prodPerAnimal = +(milk * 0.30).toFixed(2);
      const fodderOffset = fodder.id === 'dry_only' ? 0.2 : fodder.id === 'berseem' ? -0.1 : 0;
      const perAnimalWanda = Math.max(0.3, +(maintPerAnimal + prodPerAnimal + fodderOffset).toFixed(2));
      const totalWanda = +(perAnimalWanda * count).toFixed(1);

      setRationResult({
        type: 'goat',
        count,
        weight,
        milk,
        totalWanda,
        perAnimalWanda,
        maintWanda: (maintPerAnimal * count).toFixed(1),
        prodWanda: (prodPerAnimal * count).toFixed(1),
        maintPerAnimal,
        prodPerAnimal,
        fodderOffset,
        fodderNote: fodder.note,
        fodderLabel: fodder.label,
        greenFodder: (4.0 * count).toFixed(0),
        silage: (2.0 * count).toFixed(0),
        dryFodder: (1.0 * count).toFixed(0),
        morningWanda: (totalWanda / 2).toFixed(1),
        eveningWanda: (totalWanda / 2).toFixed(1),
        waterRequirement: Math.round((milk * 3 + weight * 0.08) * count),
      });
      return;
    }

    if (animalType === 'dry') {
      const maintPerAnimal = +((weight / 500) * 1.5).toFixed(2);
      const fodderOffset = fodder.offset;
      const perAnimalWanda = Math.max(0.8, +(maintPerAnimal + fodderOffset).toFixed(2));
      const totalWanda = +(perAnimalWanda * count).toFixed(1);

      setRationResult({
        type: 'dry',
        count,
        weight,
        milk: 0,
        totalWanda,
        perAnimalWanda,
        maintWanda: (maintPerAnimal * count).toFixed(1),
        prodWanda: '0',
        maintPerAnimal,
        prodPerAnimal: 0,
        fodderOffset,
        fodderNote: fodder.note,
        fodderLabel: fodder.label,
        greenFodder: (25 * count).toFixed(0),
        silage: (15 * count).toFixed(0),
        dryFodder: (6 * count).toFixed(0),
        morningWanda: (totalWanda / 2).toFixed(1),
        eveningWanda: (totalWanda / 2).toFixed(1),
        waterRequirement: Math.round(weight * 0.08 * count),
      });
      return;
    }

    // Dairy Buffalo (Nili-Ravi) vs Dairy Cow (Sahiwal / Crossbred)
    const isBuffalo = animalType === 'buffalo';
    const maintPerAnimal = +(isBuffalo ? (weight / 550) * 1.8 : (weight / 400) * 1.2).toFixed(2);
    // Production wanda: 480g/L for buffalo (6-7% fat), 380g/L for cow (3.8-4.2% fat)
    const prodRate = isBuffalo ? 0.48 : 0.38;
    const prodPerAnimal = +(milk * prodRate).toFixed(2);
    const fodderOffset = fodder.offset;

    // Net per-animal wanda combining maintenance, milk production, and fodder offset
    const perAnimalWanda = Math.max(1.0, +(maintPerAnimal + prodPerAnimal + fodderOffset).toFixed(2));
    const totalWanda = +(perAnimalWanda * count).toFixed(1);

    const greenFodder = Math.round((fodder.green * (weight / (isBuffalo ? 550 : 400))) * count);
    const dryFodder = Math.round((fodder.toori * (weight / (isBuffalo ? 550 : 400))) * count);
    const silage = Math.round((fodder.silage * (weight / (isBuffalo ? 550 : 400))) * count);
    const waterRequirement = Math.round((milk * 3.5 + weight * 0.08) * count);

    setRationResult({
      type: animalType,
      count,
      milk,
      weight,
      perAnimalWanda,
      maintWanda: (maintPerAnimal * count).toFixed(1),
      prodWanda: (prodPerAnimal * count).toFixed(1),
      maintPerAnimal,
      prodPerAnimal,
      fodderOffset,
      fodderLabel: fodder.label,
      fodderNote: fodder.note,
      totalWanda,
      greenFodder,
      silage,
      dryFodder,
      morningWanda: (totalWanda / 2).toFixed(1),
      eveningWanda: (totalWanda / 2).toFixed(1),
      waterRequirement,
      dryMatterNeeded: (weight * 0.03).toFixed(1),
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
                  onClick={() => handleAnimalChange(a.id)}
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

          {/* Animal Live Weight Input (except poultry) */}
          {animalType !== 'poultry' && (
            <div style={{ marginTop: 10 }}>
              <label className="input-label" style={{ fontWeight: 700, marginBottom: 4, display: 'block' }}>
                جانور کا لائیو وزن (کلو — فی جانور):
              </label>
              <input
                type="number" className="input" placeholder="550"
                value={animalWeight} min="20" max="900" step="10" dir="ltr"
                onChange={e => { setAnimalWeight(e.target.value); setRationResult(null); }}
                style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: '1rem', fontWeight: 800, fontFamily: 'Inter' }}
              />
              <div style={{ fontSize: '.68rem', color: '#78350f', marginTop: 3 }}>
                {animalType === 'buffalo'
                  ? '💡 نیلی راوی بھینس اوسط وزن: 500 تا 650 کلو (UVAS ریسرچ)'
                  : animalType === 'cow'
                  ? '💡 ساہیوال گائے اوسط وزن: 350 تا 450 کلو (کراس فریزن 450 تا 600 کلو)'
                  : animalType === 'calf'
                  ? '💡 بچھڑا/کٹڑا وزن: 150 تا 300 کلو (Fattening گروتھ اسٹیج)'
                  : animalType === 'goat'
                  ? '💡 بکری اوسط وزن: 35 تا 55 کلو'
                  : '💡 اوسط جسمانی وزن کے مطابق بنیادی زندگی کا ونڈا اور خشک مادہ (DM) طے ہوگا'}
              </div>
            </div>
          )}

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
                  ? '💡 نیلی راوی بھینس: فی لیٹر دودھ 480 گرام ونڈا درکار ہوتا ہے (6.5% تا 7% فیٹ معیار)'
                  : animalType === 'cow'
                  ? '💡 ساہیوال گائے: فی لیٹر دودھ 380 گرام ونڈا درکار ہوتا ہے (3.8% تا 4.2% فیٹ)'
                  : '💡 بکری: فی لیٹر دودھ 300 گرام ونڈا درکار ہوتا ہے'}
              </div>
            </div>
          )}

          {/* Fodder Selection (for ruminants) */}
          {animalType !== 'poultry' && animalType !== 'horse' && (
            <div style={{ marginTop: 10 }}>
              <label className="input-label" style={{ fontWeight: 700, marginBottom: 4, display: 'block' }}>
                فارم پر دستیاب چارے کی قسم منتخب کریں:
              </label>
              <select
                value={fodderType}
                onChange={e => { setFodderType(e.target.value); setRationResult(null); }}
                style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: '.84rem', fontWeight: 700, background: 'white', fontFamily: 'Inter, sans-serif' }}
              >
                {FODDER_TYPES.map(f => (
                  <option key={f.id} value={f.id}>{f.label}</option>
                ))}
              </select>
              <div style={{ fontSize: '.68rem', color: '#047857', marginTop: 3 }}>
                💡 {FODDER_TYPES.find(f => f.id === fodderType)?.note}
              </div>
            </div>
          )}

          {/* Animal / Bird Count */}
          <div style={{ marginTop: 10 }}>
            <label className="input-label" style={{ fontWeight: 700, marginBottom: 4, display: 'block' }}>
              {animalType === 'poultry' ? 'مرغیوں / پرندوں کی تعداد:' : 'جانوروں کی تعداد:'}
            </label>
            <input
              type="number" className="input" placeholder="1"
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
              
              {/* 🐔 DEDICATED POULTRY VIEW */}
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
                    <div style={{ fontSize: '.76rem', color: '#fde68a', marginTop: 2, fontWeight: 700 }}>
                      فی جانور روزانہ ونڈا: {rationResult.perAnimalWanda} کلو
                    </div>
                  </div>

                  {/* 🔬 UVAS Scientific Formulation Breakdown */}
                  {rationResult.maintPerAnimal !== undefined && (
                    <div style={{ background: 'white', borderRadius: 12, border: '1.5px solid #fde68a', padding: '0.85rem', marginBottom: 10 }}>
                      <div style={{ fontWeight: 800, fontSize: '.82rem', color: '#78350f', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span>🔬</span>
                        <span>یہ مقدار کس بنیاد پر تجویز کی گئی ہے؟ (UVAS سائنسی تجزیہ)</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '.74rem', color: '#334155' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dashed #e2e8f0' }}>
                          <span>1. جسمانی بقا (Maintenance برائے {rationResult.weight} کلو وزن):</span>
                          <strong style={{ fontFamily: 'Inter', color: '#b45309' }}>{rationResult.maintPerAnimal} کلو</strong>
                        </div>
                        {rationResult.milk > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dashed #e2e8f0' }}>
                            <span>2. دودھ پیداوار (Production برائے {rationResult.milk} لیٹر):</span>
                            <strong style={{ fontFamily: 'Inter', color: '#15803d' }}>+{rationResult.prodPerAnimal} کلو</strong>
                          </div>
                        )}
                        {rationResult.fodderOffset !== 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dashed #e2e8f0' }}>
                            <span>3. چارے کا اثر ({rationResult.fodderLabel?.split('(')[0]?.trim()}):</span>
                            <strong style={{ fontFamily: 'Inter', color: rationResult.fodderOffset < 0 ? '#15803d' : '#dc2626' }}>
                              {rationResult.fodderOffset > 0 ? `+${rationResult.fodderOffset}` : `${rationResult.fodderOffset}`} کلو
                            </strong>
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 4, fontWeight: 800, color: '#78350f', fontSize: '.82rem' }}>
                          <span>= کل متوازن یومیہ خوراک (فی جانور):</span>
                          <span style={{ fontFamily: 'Inter', color: '#92400e' }}>{rationResult.perAnimalWanda} کلو</span>
                        </div>
                      </div>
                      {rationResult.dryMatterNeeded && (
                        <div style={{ marginTop: 6, fontSize: '.68rem', color: '#64748b' }}>
                          📊 روزانہ خشک مادہ کی گنجائش (DM): <strong>{rationResult.dryMatterNeeded} کلو</strong> (وزن کا 3% معیار)
                        </div>
                      )}
                    </div>
                  )}

                  {/* Daily Schedule Split (Morning/Evening) & Water Intake */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 10 }}>
                    <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '.6rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '.66rem', color: '#92400e', fontWeight: 700 }}>🌅 صبح کا راشن (50%)</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#b45309', fontFamily: 'Inter', marginTop: 2 }} dir="ltr">
                        {rationResult.morningWanda} کلو
                      </div>
                      <div style={{ fontSize: '.6rem', color: '#a16207' }}>ہلکے نم چارے کے ساتھ</div>
                    </div>

                    <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 10, padding: '.6rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '.66rem', color: '#92400e', fontWeight: 700 }}>🌇 شام کا راشن (50%)</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#b45309', fontFamily: 'Inter', marginTop: 2 }} dir="ltr">
                        {rationResult.eveningWanda} کلو
                      </div>
                      <div style={{ fontSize: '.6rem', color: '#a16207' }}>شام کے دوہنے پر</div>
                    </div>

                    <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '.6rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '.66rem', color: '#1e40af', fontWeight: 700 }}>💧 پانی کی ضرورت</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#1d4ed8', fontFamily: 'Inter', marginTop: 2 }} dir="ltr">
                        {rationResult.waterRequirement} L
                      </div>
                      <div style={{ fontSize: '.6rem', color: '#3b82f6' }}>صاف ٹھنڈا پانی یومیہ</div>
                    </div>
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
                  `وزن: ${rationResult.weight} کلو ${rationResult.milk > 0 ? `| دودھ: ${rationResult.milk} لیٹر` : ''}`,
                  '━━━━━━━━━━━━━━━━━',
                  `کل روزانہ ونڈا: ${rationResult.totalWanda} کلو (فی جانور: ${rationResult.perAnimalWanda} کلو)`,
                  `• صبح راشن: ${rationResult.morningWanda} کلو | شام راشن: ${rationResult.eveningWanda} کلو`,
                  `سبز چارہ: ${rationResult.greenFodder} کلو | خشک چارہ (توڑی): ${rationResult.dryFodder} کلو`,
                  `پانی کی ضرورت: ${rationResult.waterRequirement} لیٹر روزانہ`,
                  '━━━━━━━━━━━━━━━━━',
                  '📚 ماخذ: UVAS لاہور + BRI پتوکی | 📞 لائیو سٹاک ہیلپ لائن: 0800-15000',
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
                <div style={{ fontSize: '.8rem', opacity: .9 }}>درست لیکٹو میٹر ریڈنگ (Corrected CLR @ 60°F)</div>
                <div style={{ fontSize: '2.6rem', fontWeight: 900, fontFamily: 'Inter', marginTop: 2 }} dir="ltr">
                  {lactResult.correctedLR}
                </div>
                <div style={{ fontSize: '.75rem', color: '#ddd6fe', marginTop: 2 }}>
                  مشاہدہ شدہ: {lactResult.observedLR} → درست: {lactResult.correctedLR} (درجہ حرارت فرق: +{lactResult.fraudDiff})
                </div>
              </div>

              {/* Water Adulteration Warning */}
              {lactResult.waterAdulterationPct > 0 && (
                <div style={{ background: '#fef2f2', border: '2px solid #ef4444', borderRadius: 12, padding: '10px 14px', marginBottom: 10 }}>
                  <div style={{ fontWeight: 800, color: '#b91c1c', fontSize: '.84rem', marginBottom: 4 }}>
                    🚨 ممکنہ پانی ملاوٹ — تقریباً {lactResult.waterAdulterationPct}% ملاوٹ کا شبہ!
                  </div>
                  <div style={{ fontSize: '.72rem', color: '#991b1b', lineHeight: 1.6 }}>
                    خالص دودھ کا CLR کم از کم 28 تا 30 ہونا چاہیے۔ کم CLR پانی ملاوٹ یا کم فیٹ کی نشاندہی کرتا ہے۔
                  </div>
                </div>
              )}

              {/* Fraud alert if temperature penalty */}
              {lactResult.fraudDiff >= 2 && (
                <div style={{ background: '#fffbeb', border: '2px solid #f59e0b', borderRadius: 12, padding: '10px 14px', marginBottom: 10 }}>
                  <div style={{ fontWeight: 800, color: '#b45309', fontSize: '.82rem', marginBottom: 4 }}>
                    ⚠️ گرم دودھ کا اثر — ڈوڈھی کو آگاہ کریں!
                  </div>
                  <div style={{ fontSize: '.7rem', color: '#92400e', lineHeight: 1.6 }}>
                    آپ کا دودھ {lactResult.milkTempF}°F گرم تھا۔ درجہ حرارت کی وجہ سے CLR {lactResult.fraudDiff} درجے کم دکھ رہا تھا۔
                    <br /><strong>مطالبہ کریں: ٹھنڈا دودھ یا درست درجہ حرارت کریکشن کے ساتھ پیمائش۔</strong>
                  </div>
                </div>
              )}

              {/* 4-Metric Scientific Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                <div style={{ background: lactResult.waterAdulterationPct > 0 ? '#fef2f2' : '#f0fdf4', border: `1.5px solid ${lactResult.waterAdulterationPct > 0 ? '#fca5a5' : '#86efac'}`, borderRadius: 10, padding: '0.75rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '.68rem', color: lactResult.waterAdulterationPct > 0 ? '#991b1b' : '#166534', fontWeight: 700 }}>پانی ملاوٹ شبہ</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: lactResult.waterAdulterationPct > 0 ? '#dc2626' : '#15803d', fontFamily: 'Inter' }} dir="ltr">
                    {lactResult.waterAdulterationPct}%
                  </div>
                  <div style={{ fontSize: '.62rem', color: lactResult.waterAdulterationPct > 0 ? '#b91c1c' : '#16a34a' }}>
                    {lactResult.waterAdulterationPct === 0 ? 'خالص (ملاوٹ سے پاک)' : 'غیر معیاری دودھ'}
                  </div>
                </div>

                <div style={{ background: '#faf5ff', border: '1.5px solid #c4b5fd', borderRadius: 10, padding: '0.75rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '.68rem', color: '#6d28d9', fontWeight: 700 }}>مخصوص وزن (Sp. Gr.)</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#7c3aed', fontFamily: 'Inter' }} dir="ltr">
                    {lactResult.specificGravity}
                  </div>
                  <div style={{ fontSize: '.62rem', color: '#6d28d9' }}>معیار: 1.028–1.032</div>
                </div>

                <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 10, padding: '0.75rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '.68rem', color: '#1e40af', fontWeight: 700 }}>ٹھوس اجزاء (SNF)</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#1d4ed8', fontFamily: 'Inter' }} dir="ltr">
                    {lactResult.snfPct}%
                  </div>
                  <div style={{ fontSize: '.62rem', color: '#2563eb' }}>بنیاد: Richmond فارمولا</div>
                </div>

                <div style={{ background: '#fefce8', border: '1.5px solid #fde047', borderRadius: 10, padding: '0.75rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '.68rem', color: '#854d0e', fontWeight: 700 }}>تخمینہ فیٹ (Fat)</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#a16207', fontFamily: 'Inter' }} dir="ltr">
                    ~{lactResult.estimatedFatPct}%
                  </div>
                  <div style={{ fontSize: '.62rem', color: '#854d0e' }}>بھینس: 6%+ | گائے: 3.5%+</div>
                </div>
              </div>

              {/* Instructions */}
              <div style={{ background: '#fffbeb', border: '1px solid #f59e0b', borderRadius: 10, padding: '8px 12px', fontSize: '.7rem', color: '#78350f', lineHeight: 1.5 }}>
                💡 <strong>UVAS ڈیری ہدایت:</strong> دوہنے کے فوری بعد دودھ کا نمونہ 60°F (15.5°C) پر ٹھنڈا کر کے لیکٹومیٹر ڈالیں۔ یا یہ درجہ حرارت کریکشن ٹول استعمال کریں۔ ہیلپ لائن: 0800-17000
              </div>
            </div>
          )}

          {/* Reference table */}
          <div style={{ marginTop: 12, background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ background: '#7c3aed', color: 'white', padding: '6px 12px', fontWeight: 800, fontSize: '.78rem' }}>
              📊 حوالہ جاتی CLR جدول (UVAS لاہور / Zeal Lactometer)
            </div>
            {[
              { lr: '30–32', fat: 'بھینس خالص', quality: '⭐⭐⭐ اعلیٰ (ملاوٹ 0%)', color: '#f0fdf4' },
              { lr: '28–30', fat: 'گائے خالص', quality: '⭐⭐ معیاری (ملاوٹ 0%)', color: 'white' },
              { lr: '24–27', fat: 'پتلا دودھ', quality: '⭐ قابل قبول (ملاوٹ 10-15%)', color: '#f0fdf4' },
              { lr: '20–24', fat: 'کمزور معیار', quality: '⚠️ ملاوٹ کا شبہ (20-30%)', color: '#fffbeb' },
              { lr: '20 سے کم', fat: 'شدید پتلا', quality: '⛔ ملاوٹ شدہ / پانی (35%+)', color: '#fef2f2' },
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
