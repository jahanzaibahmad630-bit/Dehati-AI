import { useState } from 'react';
import InstitutionalBadge from '../ui/InstitutionalBadge';

const CROP_PRESETS = {
  'گندم':   { cost: 90000,  yieldVal: 42,  msp: 3900,  unit: 'من', icon: '🌾', note: 'سرکاری امدادی ہدف ₨3,900–4,200/من' },
  'کپاس':   { cost: 130000, yieldVal: 22,  msp: 7800,  unit: 'من', icon: '🌿', note: 'پھٹی کم از کم محفوظ ریٹ ₨7,800/من' },
  'چاول':   { cost: 105000, yieldVal: 45,  msp: 4400,  unit: 'من', icon: '🍚', note: 'سپر باسمتی منڈی ہدف ₨4,400+/من' },
  'مکئی':   { cost: 92000,  yieldVal: 80,  msp: 1850,  unit: 'من', icon: '🌽', note: 'بہاریہ مکئی محفوظ ریٹ ₨1,850/من' },
  'آلو':    { cost: 183000, yieldVal: 280, msp: 950,   unit: 'من', icon: '🥔', note: 'کولڈ اسٹور اور بیج لاگت شامل' },
  'کماد':   { cost: 183000, yieldVal: 850, msp: 450,   unit: 'من', icon: '🎋', note: 'سرکاری شوگر ملز ریٹ ₨450/من' },
};

const nas = { fontFamily: '"Noto Nastaliq Urdu", serif', direction: 'rtl' };

export default function BreakevenCalc() {
  const [selectedCrop, setSelectedCrop] = useState('گندم');
  const [cost, setCost] = useState('90000');
  const [yieldAmt, setYieldAmt] = useState('42');
  const [mandiPrice, setMandiPrice] = useState('3900');
  const [includeRent, setIncludeRent] = useState(false);
  const [rentCost, setRentCost] = useState('35000'); // 6-month seasonal rent
  const [result, setResult] = useState(null);

  const applyCrop = (c) => {
    setSelectedCrop(c);
    const p = CROP_PRESETS[c];
    if (p) {
      setCost(p.cost.toString());
      setYieldAmt(p.yieldVal.toString());
      setMandiPrice(p.msp ? p.msp.toString() : '');
    }
    setResult(null);
  };

  const calculate = () => {
    const parsedCost = parseFloat(cost);
    const parsedYield = parseFloat(yieldAmt);
    const parsedRent = includeRent ? (parseFloat(rentCost) || 0) : 0;

    if (isNaN(parsedCost) || parsedCost <= 0 || isNaN(parsedYield) || parsedYield <= 0 || parsedRent < 0) {
      return;
    }

    const c = parsedCost;
    const y = parsedYield;
    const rent = parsedRent;
    const totalCostPerAcre = c + rent;
    const bePerMaund = Math.ceil(totalCostPerAcre / y);

    const preset = CROP_PRESETS[selectedCrop];
    const msp = preset?.msp || null;
    const enteredMandi = parseFloat(mandiPrice);
    const effectivePrice = (!isNaN(enteredMandi) && enteredMandi > 0) ? enteredMandi : (msp || bePerMaund);
    const profitPerMaund = effectivePrice - bePerMaund;
    const totalProfitPerAcre = profitPerMaund * y;

    setResult({
      totalCostPerAcre,
      yieldAmt: y,
      bePerMaund,
      includeRent,
      rent,
      msp,
      effectivePrice,
      profitPerMaund,
      totalProfitPerAcre,
      selectedCrop
    });
  };

  return (
    <div dir="rtl" style={{ ...nas }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #166534, #15803d)', borderRadius: 14, padding: '0.85rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'white' }}>
        <div style={{ fontSize: '1.6rem' }}>⚖️</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>بریک ایون پرائس کیلکولیٹر (نقصان کی آخری حد)</div>
          <div style={{ color: '#bbf7d0', fontSize: '0.72rem', marginTop: 2 }}>
            پنجاب سپورٹ پرائس + زمینی ٹھیکہ موازنہ (کم سے کم فروخت قیمت)
          </div>
        </div>
      </div>

      <div className="form-group">
        {/* Quick Crop Presets */}
        <div>
          <label className="input-label" style={{ fontWeight: 700, marginBottom: 4, display: 'block' }}>فصل کا انتخاب کریں:</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            {Object.entries(CROP_PRESETS).map(([name, p]) => (
              <button key={name}
                onClick={() => applyCrop(name)}
                style={{
                  padding: '0.55rem', borderRadius: 8,
                  border: `2px solid ${selectedCrop === name ? '#166534' : '#e2e8f0'}`,
                  background: selectedCrop === name ? '#f0fdf4' : 'white',
                  color: selectedCrop === name ? '#166534' : '#334155',
                  fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', ...nas
                }}
              >
                {p.icon} {name}
              </button>
            ))}
          </div>
        </div>

        {/* Inputs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 8, marginTop: 10 }}>
          <div>
            <label className="input-label" style={{ fontWeight: 700, marginBottom: 4, display: 'block' }}>
              کل پیداواری خرچ فی ایکڑ (روپیہ):
            </label>
            <input
              type="number" className="input" placeholder="85000"
              value={cost} min="0" dir="ltr"
              onChange={e => { setCost(e.target.value); setResult(null); }}
              style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: 8, border: '1.5px solid #cbd5e1', fontSize: '1rem', fontWeight: 800, fontFamily: 'Inter' }}
            />
            <div style={{ fontSize: '.65rem', color: '#64748b', marginTop: 2 }}>بیج، کھاد، سپرے، ڈیزل و کٹائی</div>
          </div>

          <div>
            <label className="input-label" style={{ fontWeight: 700, marginBottom: 4, display: 'block' }}>
              متوقع پیداوار (من / ایکڑ):
            </label>
            <input
              type="number" className="input" placeholder="42"
              value={yieldAmt} min="1" dir="ltr"
              onChange={e => { setYieldAmt(e.target.value); setResult(null); }}
              style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: 8, border: '1.5px solid #cbd5e1', fontSize: '1rem', fontWeight: 800, fontFamily: 'Inter' }}
            />
          </div>
        </div>

        {/* Mandi / Selling Rate */}
        <div style={{ marginTop: 10 }}>
          <label className="input-label" style={{ fontWeight: 700, marginBottom: 4, display: 'block' }}>
            مقامی منڈی یا متوقع فروخت ریٹ (روپے / من):
          </label>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              type="number" className="input" placeholder="3900"
              value={mandiPrice} min="0" dir="ltr"
              onChange={e => { setMandiPrice(e.target.value); setResult(null); }}
              style={{ flex: 1, padding: '0.6rem 0.8rem', borderRadius: 8, border: '1.5px solid #cbd5e1', fontSize: '1rem', fontWeight: 800, fontFamily: 'Inter' }}
            />
            {CROP_PRESETS[selectedCrop]?.msp && (
              <button
                type="button"
                onClick={() => { setMandiPrice(CROP_PRESETS[selectedCrop].msp.toString()); setResult(null); }}
                style={{ padding: '0.6rem 0.8rem', borderRadius: 8, border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '.72rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', ...nas }}
              >
                🏛️ سرکاری ریٹ (₨{CROP_PRESETS[selectedCrop].msp})
              </button>
            )}
          </div>
          <div style={{ fontSize: '.65rem', color: '#64748b', marginTop: 2 }}>اپنی قریبی غلہ منڈی کی موجودہ بولی یا متوقع فروخت قیمت درج کریں</div>
        </div>

        {/* Land Rent Toggle */}
        <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '10px 12px', marginTop: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: '.82rem', color: '#1e293b' }}>
                کیا زمین ٹھیکے پر ہے؟ (Land Rent)
              </div>
              <div style={{ fontSize: '.68rem', color: '#64748b' }}>
                ٹھیکہ شامل کرنے سے حقیقی بریک ایون ریٹ سامنے آتا ہے
              </div>
            </div>
            <button
              onClick={() => { setIncludeRent(!includeRent); setResult(null); }}
              style={{
                padding: '4px 12px', borderRadius: 20, border: 'none',
                background: includeRent ? '#15803d' : '#cbd5e1',
                color: 'white', fontWeight: 800, fontSize: '.75rem', cursor: 'pointer'
              }}
            >
              {includeRent ? '✓ شامل ہے' : 'شامل کریں'}
            </button>
          </div>

          {includeRent && (
            <div style={{ marginTop: 8 }}>
              <label style={{ fontSize: '.72rem', color: '#475569', fontWeight: 700, display: 'block', marginBottom: 2 }}>
                فصل کا ٹھیکہ فی ایکڑ (6 ماہ):
              </label>
              <input
                type="number" placeholder="35000" dir="ltr"
                value={rentCost}
                onChange={e => { setRentCost(e.target.value); setResult(null); }}
                style={{ width: '100%', padding: '0.5rem', borderRadius: 8, border: '1.5px solid #cbd5e1', fontSize: '.95rem', fontWeight: 800, fontFamily: 'Inter' }}
              />
            </div>
          )}
        </div>

        {/* Calculate Button */}
        <button
          onClick={calculate} disabled={!cost || !yieldAmt || parseFloat(cost) <= 0 || parseFloat(yieldAmt) <= 0}
          style={{ width: '100%', marginTop: 12, padding: '0.8rem', background: 'linear-gradient(135deg, #166534, #15803d)', color: 'white', borderRadius: 10, border: 'none', fontWeight: 800, fontSize: '.95rem', cursor: 'pointer', ...nas }}
        >
          ✓ بریک ایون و محفوظ ریٹ حساب لگائیں
        </button>

        {/* Result Card */}
        {result && (
          <div className="animate-fade-in-up" style={{ marginTop: 14 }}>
            <div style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', borderRadius: 14, padding: '1rem', textAlign: 'center', color: 'white', marginBottom: 10 }}>
              <div style={{ fontSize: '.8rem', opacity: .85 }}>
                {result.selectedCrop} — فی من کم سے کم فروخت قیمت (Breakeven)
              </div>
              <div style={{ fontSize: '2.5rem', fontWeight: 900, fontFamily: 'Inter', marginTop: 2, color: '#fde68a' }} dir="ltr">
                ₨{result.bePerMaund.toLocaleString()} / من
              </div>
              <div style={{ fontSize: '.75rem', color: '#cbd5e1', marginTop: 2 }}>
                کل لاگت: ₨{result.totalCostPerAcre.toLocaleString()} فی ایکڑ (پیداوار: {result.yieldAmt} من)
              </div>
            </div>

            {/* Profit / Loss Outcome at entered Selling Price */}
            <div style={{ background: result.profitPerMaund >= 0 ? '#f0fdf4' : '#fef2f2', border: `1.5px solid ${result.profitPerMaund >= 0 ? '#86efac' : '#fca5a5'}`, borderRadius: 12, padding: '12px 14px', marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '.85rem', color: result.profitPerMaund >= 0 ? '#166534' : '#991b1b' }}>
                    {result.profitPerMaund >= 0 ? '✅ متوقع خالص منافع' : '⚠️ متوقع مالی نقصان'}
                  </div>
                  <div style={{ fontSize: '.72rem', color: result.profitPerMaund >= 0 ? '#15803d' : '#7f1d1d' }}>
                    فروخت ریٹ ₨{result.effectivePrice.toLocaleString()}/من کے حساب سے:
                  </div>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 900, color: result.profitPerMaund >= 0 ? '#15803d' : '#be123c', fontFamily: 'Inter' }} dir="ltr">
                    {result.profitPerMaund >= 0 ? '+' : ''}₨{Math.round(result.totalProfitPerAcre).toLocaleString()}
                  </div>
                  <div style={{ fontSize: '.68rem', color: '#64748b' }}>فی ایکڑ بچت</div>
                </div>
              </div>
            </div>

            {/* Warning & Safe Bands */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
              <div style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 10, padding: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '.72rem', color: '#991b1b', fontWeight: 800 }}>⚠️ نقصان زون</div>
                <div style={{ fontSize: '.75rem', color: '#7f1d1d', marginTop: 2 }}>
                  ₨{result.bePerMaund.toLocaleString()} سے کم ریٹ پر بیچنے سے جیب سے گھاٹا ہوگا
                </div>
              </div>

              <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 10, padding: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '.72rem', color: '#166534', fontWeight: 800 }}>✅ منافع زون</div>
                <div style={{ fontSize: '.75rem', color: '#14532d', marginTop: 2 }}>
                  ₨{result.bePerMaund.toLocaleString()} سے اوپر ہر روپیہ خالص منافع ہے
                </div>
              </div>
            </div>

            {/* Government MSP Comparison */}
            {result.msp && (
              <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 10, padding: '10px 14px', marginBottom: 10 }}>
                <div style={{ fontWeight: 800, color: '#1e40af', fontSize: '.82rem' }}>
                  🏛️ حکومتی ریٹ موازنہ (سرکاری ریٹ: ₨{result.msp.toLocaleString()}/من):
                </div>
                <div style={{ fontSize: '.78rem', color: '#1e3a8a', marginTop: 4, lineHeight: 1.5 }}>
                  {result.msp >= result.bePerMaund ? (
                    <span>
                      اگر آپ حکومتی نرخ پر فروخت کریں تو آپ کو <strong>₨{(result.msp - result.bePerMaund).toLocaleString()} فی من</strong> بچت ہوگی۔ یعنی کل <strong>₨{((result.msp - result.bePerMaund) * result.yieldAmt).toLocaleString()} فی ایکڑ خالص منافع</strong>۔
                    </span>
                  ) : (
                    <span>
                      ⚠️ حکومتی ریٹ (₨{result.msp}) آپ کے پیداواری خرچ (₨{result.bePerMaund}) سے کم ہے۔ لاگت کم کرنے کی ضرورت ہے۔
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Written Legal / Agronomic Warning & Disclaimer */}
        <div style={{ background: '#fffbeb', border: '1.5px solid #f59e0b', borderRadius: 12, padding: '10px 14px', marginTop: 14, marginBottom: 10, fontSize: '.72rem', color: '#78350f', lineHeight: 1.6 }}>
          <div style={{ fontWeight: 800, color: '#92400e', marginBottom: 4, fontSize: '.78rem' }}>
            ⚠️ تحریری ڈس کلیمر (بریک ایون ریٹ وارننگ):
          </div>
          یہ بریک ایون حساب ایوب زرعی تحقیقاتی ادارہ (AARI) اور محکمہ زراعت پنجاب کے 2025–2026 اوسط پیداواری بجٹ پر مبنی ہے۔ اصل لاگت ڈیزل، کھاد اور ٹیوب ویل کے بلوں کے لحاظ سے مختلف ہو سکتی ہے۔ غلہ منڈی میں سودا طے کرنے سے پہلے اپنی اصل رسیدوں کے مطابق حساب ضرور چیک کریں۔
        </div>

        <div style={{ marginTop: 8 }}>
          <InstitutionalBadge type="aari" helpline="0800-17000" />
        </div>
      </div>
    </div>
  );
}
