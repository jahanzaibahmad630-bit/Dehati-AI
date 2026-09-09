import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getFarmerProfile, saveFarmerProfile, clearFarmerProfile } from '../../services/api';
import { PUNJAB_TEHSILS, WATER_SOURCES, WARABANDI_DAYS, IRRIGATION_METHODS } from '../../data/punjabTehsils';

const SECTION_STYLE = {
  background: 'white',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--gray-200)',
  padding: '1rem',
  marginBottom: '1rem'
};

const CHIP_STYLE = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '.4rem',
  background: 'var(--green-50)',
  border: '1px solid var(--green-200)',
  borderRadius: 'var(--radius-full)',
  padding: '.35rem .75rem',
  fontSize: '.82rem',
  color: 'var(--green-800)',
  margin: '.25rem'
};

const SELECT_CHIP_STYLE = (selected) => ({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '.45rem .85rem',
  borderRadius: 'var(--radius-full)',
  border: selected ? '1.5px solid var(--green-700)' : '1px solid var(--gray-200)',
  background: selected ? 'linear-gradient(135deg, var(--green-700), var(--green-800))' : 'var(--gray-50)',
  color: selected ? 'white' : 'var(--gray-800)',
  fontSize: '.82rem',
  fontWeight: selected ? '700' : '500',
  cursor: 'pointer',
  margin: '.25rem .2rem',
  transition: 'all 0.15s ease',
  minHeight: 38
});

const ADD_BTN = {
  background: 'none',
  border: '1px dashed var(--green-400)',
  borderRadius: 'var(--radius-md)',
  padding: '.6rem 1rem',
  color: 'var(--green-700)',
  fontSize: '.85rem',
  cursor: 'pointer',
  width: '100%',
  marginTop: '.5rem',
  minHeight: 44
};

const INPUT_STYLE = {
  width: '100%',
  padding: '.55rem .75rem',
  border: '1px solid var(--gray-300)',
  borderRadius: 'var(--radius-sm)',
  fontSize: '.88rem',
  direction: 'rtl',
  marginBottom: '.4rem'
};

const REMOVE_BTN = {
  background: 'none',
  border: 'none',
  color: '#ef4444',
  cursor: 'pointer',
  fontSize: '.9rem',
  padding: '.2rem .4rem',
  borderRadius: '50%',
  minWidth: 28,
  minHeight: 28
};

export default function MyFarm() {
  const { user } = useAuth();
  const district = user?.district || 'ملتان';
  const tehsils = PUNJAB_TEHSILS[district] || PUNJAB_TEHSILS['ملتان'] || [];

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showClear, setShowClear] = useState(false);
  const [addingCrop, setAddingCrop] = useState(false);
  const [addingLivestock, setAddingLivestock] = useState(false);
  const [addingSpray, setAddingSpray] = useState(false);
  const [newCrop, setNewCrop] = useState({ name: '', acres: '', variety: '' });
  const [newLivestock, setNewLivestock] = useState({ type: '', breed: '', count: '', milk_liters: '' });
  const [newSpray, setNewSpray] = useState({ chemical: '', crop: '', date: '', dose: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await getFarmerProfile();
      setProfile(data.profile || {
        crops: [], livestock: [], spray_log: [], soil: {}, notes: '',
        tehsil: '', water_source: '', warabandi_day: '', irrigation_method: ''
      });
    } catch (e) {
      setProfile({
        crops: [], livestock: [], spray_log: [], soil: {}, notes: '',
        tehsil: '', water_source: '', warabandi_day: '', irrigation_method: ''
      });
    } finally {
      setLoading(false);
    }
  };

  const save = useCallback(async (updated) => {
    setSaving(true);
    setError('');
    try {
      const res = await saveFarmerProfile(updated);
      setProfile(res.profile || updated);
    } catch (e) {
      setError('محفوظ نہیں ہو سکا — دوبارہ کوشش کریں');
    } finally {
      setSaving(false);
    }
  }, []);

  const handleClear = async () => {
    try {
      await clearFarmerProfile();
      setProfile({
        crops: [], livestock: [], spray_log: [], soil: {}, notes: '',
        tehsil: '', water_source: '', warabandi_day: '', irrigation_method: ''
      });
      setShowClear(false);
    } catch (e) {
      setError('صاف نہیں ہو سکا');
    }
  };

  // Water & Irrigation actions
  const selectWaterSource = (source) => {
    const val = profile?.water_source === source ? null : source;
    save({ ...profile, water_source: val });
  };

  const selectWarabandi = (day) => {
    const val = profile?.warabandi_day === day ? null : day;
    save({ ...profile, warabandi_day: val });
  };

  const selectIrrigationMethod = (method) => {
    const val = profile?.irrigation_method === method ? null : method;
    save({ ...profile, irrigation_method: val });
  };

  const selectTehsil = (tehsil) => {
    const val = profile?.tehsil === tehsil ? null : tehsil;
    save({ ...profile, tehsil: val });
  };

  // Crop actions
  const addCrop = () => {
    if (!newCrop.name?.trim()) return;
    const updated = {
      ...profile,
      crops: [...(profile.crops || []), {
        name: newCrop.name.trim(),
        acres: newCrop.acres ? parseFloat(newCrop.acres) : null,
        variety: newCrop.variety.trim() || null
      }]
    };
    setNewCrop({ name: '', acres: '', variety: '' });
    setAddingCrop(false);
    save(updated);
  };

  const removeCrop = (idx) => {
    const updated = { ...profile, crops: profile.crops.filter((_, i) => i !== idx) };
    save(updated);
  };

  // Livestock actions
  const addLivestock = () => {
    if (!newLivestock.type?.trim()) return;
    const updated = {
      ...profile,
      livestock: [...(profile.livestock || []), {
        type: newLivestock.type.trim(),
        breed: newLivestock.breed.trim() || null,
        count: newLivestock.count ? parseInt(newLivestock.count) : null,
        milk_liters: newLivestock.milk_liters ? parseFloat(newLivestock.milk_liters) : null
      }]
    };
    setNewLivestock({ type: '', breed: '', count: '', milk_liters: '' });
    setAddingLivestock(false);
    save(updated);
  };

  const removeLivestock = (idx) => {
    const updated = { ...profile, livestock: profile.livestock.filter((_, i) => i !== idx) };
    save(updated);
  };

  // Spray actions
  const addSpray = () => {
    if (!newSpray.chemical?.trim()) return;
    const updated = {
      ...profile,
      spray_log: [...(profile.spray_log || []), {
        chemical: newSpray.chemical.trim(),
        crop: newSpray.crop.trim() || null,
        date: newSpray.date || new Date().toISOString().split('T')[0],
        dose: newSpray.dose.trim() || null
      }]
    };
    setNewSpray({ chemical: '', crop: '', date: '', dose: '' });
    setAddingSpray(false);
    save(updated);
  };

  const removeSpray = (idx) => {
    const updated = { ...profile, spray_log: profile.spray_log.filter((_, i) => i !== idx) };
    save(updated);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-500)' }}>
        <div className="spinner" style={{ margin: '0 auto 1rem' }} />
        لوڈ ہو رہا ہے...
      </div>
    );
  }

  const hasCrops = profile?.crops?.length > 0;
  const hasLivestock = profile?.livestock?.length > 0;
  const hasSprays = profile?.spray_log?.length > 0;
  const hasSoil = profile?.soil && Object.keys(profile.soil).some(k => profile.soil[k]);
  const hasWater = profile?.water_source || profile?.warabandi_day || profile?.irrigation_method;
  const hasTehsil = !!profile?.tehsil;
  const hasAnyData = hasCrops || hasLivestock || hasSprays || hasSoil || hasWater || hasTehsil;

  return (
    <div style={{ direction: 'rtl' }}>
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, var(--green-800) 0%, #1a472a 100%)',
        borderRadius: 'var(--radius-md)',
        padding: '1rem',
        color: 'white',
        textAlign: 'center',
        marginBottom: '1rem'
      }}>
        <div style={{ fontSize: '2rem' }}>🌾</div>
        <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>میرا فارم (Smart Farm Profile)</div>
        <div style={{ opacity: 0.85, fontSize: '.78rem', marginTop: '.2rem' }}>
          AI آپ کے رقبے، پانی، فصلوں اور مویشیوں کا مکمل ریکارڈ یاد رکھے گا
        </div>
      </div>

      {!hasAnyData && (
        <div style={{
          background: 'var(--green-50)',
          border: '1px solid var(--green-200)',
          borderRadius: 'var(--radius-md)',
          padding: '1.25rem',
          textAlign: 'center',
          marginBottom: '1rem',
          fontSize: '.88rem',
          color: 'var(--green-800)'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '.5rem' }}>💡</div>
          <strong>ابھی تک کوئی تفصیلات شامل نہیں</strong>
          <p style={{ margin: '.5rem 0 0', opacity: 0.85, fontSize: '.82rem' }}>
            تحصیل، پانی کا ذریعہ اور فصلیں منتخب کریں تاکہ AI آپ کو 100% مقامی اور درست مشورہ دے سکے۔
          </p>
        </div>
      )}

      {error && (
        <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '.5rem', borderRadius: 'var(--radius-sm)', marginBottom: '.5rem', fontSize: '.82rem', textAlign: 'center' }}>
          ❌ {error}
        </div>
      )}

      {saving && (
        <div style={{ textAlign: 'center', fontSize: '.78rem', color: 'var(--green-600)', marginBottom: '.5rem' }}>
          محفوظ ہو رہا ہے...
        </div>
      )}

      {/* ── 1. Tehsil & Sub-District Section ──────────────────── */}
      <div style={SECTION_STYLE}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.4rem' }}>
          <div>
            <strong style={{ fontSize: '.95rem' }}>📍 علاقہ و تحصیل</strong>
            <span style={{ fontSize: '.75rem', color: 'var(--green-700)', marginRight: '.5rem', fontWeight: 600 }}>
              (ضلع {district})
            </span>
          </div>
          {profile?.tehsil && (
            <span style={{ fontSize: '.75rem', background: 'var(--green-100)', color: 'var(--green-800)', padding: '.15rem .5rem', borderRadius: 'var(--radius-full)', fontWeight: 700 }}>
              ✓ {profile.tehsil}
            </span>
          )}
        </div>
        <p style={{ fontSize: '.78rem', color: 'var(--gray-500)', margin: '0 0 .6rem' }}>
          اپنی تحصیل منتخب کریں تاکہ مقامی منڈی اور پودوں کی پیسٹ وارننگ کے مطابق الرٹس ملیں:
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.2rem' }}>
          {tehsils.map(t => (
            <button
              key={t}
              type="button"
              onClick={() => selectTehsil(t)}
              style={SELECT_CHIP_STYLE(profile?.tehsil === t)}
            >
              {profile?.tehsil === t ? '✓ ' : ''}{t}
            </button>
          ))}
        </div>
      </div>

      {/* ── 2. Water & Irrigation Section ─────────────────────── */}
      <div style={SECTION_STYLE}>
        <div style={{ marginBottom: '.4rem' }}>
          <strong style={{ fontSize: '.95rem' }}>💧 پانی اور آبپاشی نظام</strong>
        </div>
        <p style={{ fontSize: '.78rem', color: 'var(--gray-500)', margin: '0 0 .6rem' }}>
          پانی کی قسم اور وارابندی کے مطابق AI کھاد اور آبپاشی کا بہترین وقت بتائے گا:
        </p>

        {/* 2a. Water Source */}
        <div style={{ marginBottom: '.75rem' }}>
          <div style={{ fontSize: '.8rem', fontWeight: 700, color: 'var(--gray-700)', marginBottom: '.3rem' }}>
            پانی کا بنیادی ذریعہ:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.2rem' }}>
            {WATER_SOURCES.map(ws => (
              <button
                key={ws.id}
                type="button"
                onClick={() => selectWaterSource(ws.id)}
                style={SELECT_CHIP_STYLE(profile?.water_source === ws.id)}
              >
                {ws.label}
              </button>
            ))}
          </div>
        </div>

        {/* 2b. Warabandi Day (Show especially if canal or mix) */}
        <div style={{ marginBottom: '.75rem' }}>
          <div style={{ fontSize: '.8rem', fontWeight: 700, color: 'var(--gray-700)', marginBottom: '.3rem' }}>
            نہری پانی کی باری (وارابندی):
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.2rem' }}>
            {WARABANDI_DAYS.map(day => (
              <button
                key={day}
                type="button"
                onClick={() => selectWarabandi(day)}
                style={SELECT_CHIP_STYLE(profile?.warabandi_day === day)}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        {/* 2c. Irrigation Method */}
        <div>
          <div style={{ fontSize: '.8rem', fontWeight: 700, color: 'var(--gray-700)', marginBottom: '.3rem' }}>
            پانی لگانے کا طریقہ (Irrigation Method):
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.2rem' }}>
            {IRRIGATION_METHODS.map(im => (
              <button
                key={im.id}
                type="button"
                onClick={() => selectIrrigationMethod(im.id)}
                style={SELECT_CHIP_STYLE(profile?.irrigation_method === im.id)}
              >
                {im.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── 3. Crops Section ──────────────────────────────────── */}
      <div style={SECTION_STYLE}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.5rem' }}>
          <strong style={{ fontSize: '.95rem' }}>🌾 فصلیں</strong>
          <span style={{ fontSize: '.75rem', color: 'var(--gray-500)' }}>{profile?.crops?.length || 0}</span>
        </div>
        {hasCrops ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.2rem' }}>
            {profile.crops.map((c, i) => (
              <span key={i} style={CHIP_STYLE}>
                <span>{c.name}{c.acres ? ` (${c.acres} ایکڑ)` : ''}{c.variety ? ` — ${c.variety}` : ''}</span>
                <button onClick={() => removeCrop(i)} style={REMOVE_BTN}>×</button>
              </span>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: '.82rem', color: 'var(--gray-400)', textAlign: 'center', padding: '.5rem' }}>
            ابھی کوئی فصل شامل نہیں
          </div>
        )}
        {addingCrop ? (
          <div style={{ marginTop: '.5rem', background: 'var(--gray-50)', padding: '.75rem', borderRadius: 'var(--radius-sm)' }}>
            <input placeholder="فصل کا نام (مثلاً گندم)" value={newCrop.name} onChange={e => setNewCrop(p => ({ ...p, name: e.target.value }))} style={INPUT_STYLE} />
            <div style={{ display: 'flex', gap: '.4rem' }}>
              <input placeholder="رقبہ (ایکڑ)" type="number" value={newCrop.acres} onChange={e => setNewCrop(p => ({ ...p, acres: e.target.value }))} style={{ ...INPUT_STYLE, flex: 1 }} />
              <input placeholder="قسم (ورائٹی)" value={newCrop.variety} onChange={e => setNewCrop(p => ({ ...p, variety: e.target.value }))} style={{ ...INPUT_STYLE, flex: 1 }} />
            </div>
            <div style={{ display: 'flex', gap: '.5rem', marginTop: '.4rem' }}>
              <button onClick={addCrop} style={{ flex: 1, background: 'var(--green-700)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', padding: '.5rem', fontWeight: 'bold', cursor: 'pointer', minHeight: 44 }}>✓ شامل کریں</button>
              <button onClick={() => setAddingCrop(false)} style={{ flex: 1, background: 'var(--gray-100)', color: 'var(--gray-700)', border: 'none', borderRadius: 'var(--radius-sm)', padding: '.5rem', cursor: 'pointer', minHeight: 44 }}>منسوخ</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setAddingCrop(true)} style={ADD_BTN}>+ فصل شامل کریں</button>
        )}
      </div>

      {/* ── 4. Livestock Section ───────────────────────────────── */}
      <div style={SECTION_STYLE}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.5rem' }}>
          <strong style={{ fontSize: '.95rem' }}>🐄 مویشی</strong>
          <span style={{ fontSize: '.75rem', color: 'var(--gray-500)' }}>{profile?.livestock?.length || 0}</span>
        </div>
        {hasLivestock ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.2rem' }}>
            {profile.livestock.map((l, i) => (
              <span key={i} style={CHIP_STYLE}>
                <span>{l.count ? `${l.count} ` : ''}{l.type}{l.breed ? ` (${l.breed})` : ''}{l.milk_liters ? ` — ${l.milk_liters} لیٹر` : ''}</span>
                <button onClick={() => removeLivestock(i)} style={REMOVE_BTN}>×</button>
              </span>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: '.82rem', color: 'var(--gray-400)', textAlign: 'center', padding: '.5rem' }}>
            ابھی کوئی مویشی شامل نہیں
          </div>
        )}
        {addingLivestock ? (
          <div style={{ marginTop: '.5rem', background: 'var(--gray-50)', padding: '.75rem', borderRadius: 'var(--radius-sm)' }}>
            <input placeholder="قسم (مثلاً بھینس، گائے)" value={newLivestock.type} onChange={e => setNewLivestock(p => ({ ...p, type: e.target.value }))} style={INPUT_STYLE} />
            <div style={{ display: 'flex', gap: '.4rem' }}>
              <input placeholder="نسل" value={newLivestock.breed} onChange={e => setNewLivestock(p => ({ ...p, breed: e.target.value }))} style={{ ...INPUT_STYLE, flex: 1 }} />
              <input placeholder="تعداد" type="number" value={newLivestock.count} onChange={e => setNewLivestock(p => ({ ...p, count: e.target.value }))} style={{ ...INPUT_STYLE, flex: 1 }} />
            </div>
            <input placeholder="دودھ (لیٹر فی دن)" type="number" value={newLivestock.milk_liters} onChange={e => setNewLivestock(p => ({ ...p, milk_liters: e.target.value }))} style={INPUT_STYLE} />
            <div style={{ display: 'flex', gap: '.5rem', marginTop: '.4rem' }}>
              <button onClick={addLivestock} style={{ flex: 1, background: 'var(--green-700)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', padding: '.5rem', fontWeight: 'bold', cursor: 'pointer', minHeight: 44 }}>✓ شامل کریں</button>
              <button onClick={() => setAddingLivestock(false)} style={{ flex: 1, background: 'var(--gray-100)', color: 'var(--gray-700)', border: 'none', borderRadius: 'var(--radius-sm)', padding: '.5rem', cursor: 'pointer', minHeight: 44 }}>منسوخ</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setAddingLivestock(true)} style={ADD_BTN}>+ مویشی شامل کریں</button>
        )}
      </div>

      {/* ── 5. Spray Log Section ──────────────────────────────── */}
      <div style={SECTION_STYLE}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.5rem' }}>
          <strong style={{ fontSize: '.95rem' }}>💊 سپرے لاگ</strong>
          <span style={{ fontSize: '.75rem', color: 'var(--gray-500)' }}>{profile?.spray_log?.length || 0}</span>
        </div>
        {hasSprays ? (
          <div>
            {profile.spray_log.slice(0, 10).map((s, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '.4rem 0', borderBottom: '1px solid var(--gray-100)', fontSize: '.82rem' }}>
                <div>
                  <strong>{s.chemical}</strong>
                  {s.crop ? <span style={{ color: 'var(--gray-500)' }}> — {s.crop}</span> : null}
                  {s.dose ? <span style={{ color: 'var(--green-600)' }}> ({s.dose})</span> : null}
                  {s.date ? <div style={{ fontSize: '.72rem', color: 'var(--gray-400)' }}>{s.date}</div> : null}
                </div>
                <button onClick={() => removeSpray(i)} style={REMOVE_BTN}>×</button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: '.82rem', color: 'var(--gray-400)', textAlign: 'center', padding: '.5rem' }}>
            ابھی کوئی سپرے ریکارڈ نہیں
          </div>
        )}
        {addingSpray ? (
          <div style={{ marginTop: '.5rem', background: 'var(--gray-50)', padding: '.75rem', borderRadius: 'var(--radius-sm)' }}>
            <input placeholder="دوائی کا نام (مثلاً Confidor)" value={newSpray.chemical} onChange={e => setNewSpray(p => ({ ...p, chemical: e.target.value }))} style={INPUT_STYLE} />
            <div style={{ display: 'flex', gap: '.4rem' }}>
              <input placeholder="فصل" value={newSpray.crop} onChange={e => setNewSpray(p => ({ ...p, crop: e.target.value }))} style={{ ...INPUT_STYLE, flex: 1 }} />
              <input placeholder="مقدار" value={newSpray.dose} onChange={e => setNewSpray(p => ({ ...p, dose: e.target.value }))} style={{ ...INPUT_STYLE, flex: 1 }} />
            </div>
            <input type="date" value={newSpray.date} onChange={e => setNewSpray(p => ({ ...p, date: e.target.value }))} style={{ ...INPUT_STYLE, direction: 'ltr' }} />
            <div style={{ display: 'flex', gap: '.5rem', marginTop: '.4rem' }}>
              <button onClick={addSpray} style={{ flex: 1, background: 'var(--green-700)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', padding: '.5rem', fontWeight: 'bold', cursor: 'pointer', minHeight: 44 }}>✓ شامل کریں</button>
              <button onClick={() => setAddingSpray(false)} style={{ flex: 1, background: 'var(--gray-100)', color: 'var(--gray-700)', border: 'none', borderRadius: 'var(--radius-sm)', padding: '.5rem', cursor: 'pointer', minHeight: 44 }}>منسوخ</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setAddingSpray(true)} style={ADD_BTN}>+ سپرے ریکارڈ شامل کریں</button>
        )}
      </div>

      {/* ── 6. Soil Section (read from profile) ────────────────── */}
      <div style={SECTION_STYLE}>
        <div style={{ marginBottom: '.5rem' }}>
          <strong style={{ fontSize: '.95rem' }}>🔬 مٹی پروفائل</strong>
        </div>
        {hasSoil ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.3rem' }}>
            {profile.soil.ph && <span style={CHIP_STYLE}>pH: {profile.soil.ph}</span>}
            {profile.soil.ec && <span style={CHIP_STYLE}>EC: {profile.soil.ec}</span>}
            {profile.soil.om && <span style={CHIP_STYLE}>OM: {profile.soil.om}%</span>}
            {profile.soil.n && <span style={CHIP_STYLE}>N: {profile.soil.n}</span>}
            {profile.soil.p && <span style={CHIP_STYLE}>P: {profile.soil.p}</span>}
            {profile.soil.k && <span style={CHIP_STYLE}>K: {profile.soil.k}</span>}
            {profile.soil.zn && <span style={CHIP_STYLE}>Zn: {profile.soil.zn}</span>}
          </div>
        ) : (
          <div style={{ fontSize: '.82rem', color: 'var(--gray-400)', textAlign: 'center', padding: '.5rem' }}>
            مٹی ٹیسٹ ابھی نہیں ہوا — "مٹی پروفائل" ٹول سے اسکین کریں
          </div>
        )}
      </div>

      {/* ── Privacy Info badge ──────────────────────────────────── */}
      <div style={{
        background: '#eff6ff',
        border: '1px solid #bfdbfe',
        borderRadius: 'var(--radius-md)',
        padding: '.75rem',
        fontSize: '.78rem',
        color: '#1e40af',
        textAlign: 'center',
        marginBottom: '1rem'
      }}>
        🔒 آپ کا ڈیٹا صرف آپ کے اکاؤنٹ میں محفوظ ہے۔ AI صرف انہی معلومات کا حوالہ دے گا جو آپ نے شامل کی ہیں۔
      </div>

      {/* ── Clear All Button ────────────────────────────────────── */}
      {hasAnyData && (
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          {showClear ? (
            <div style={{ background: '#fee2e2', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <p style={{ color: '#b91c1c', fontWeight: 'bold', marginBottom: '.5rem', fontSize: '.9rem' }}>
                کیا آپ واقعی تمام ڈیٹا صاف کرنا چاہتے ہیں؟
              </p>
              <div style={{ display: 'flex', gap: '.5rem' }}>
                <button onClick={handleClear} style={{ flex: 1, background: '#dc2626', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', padding: '.6rem', fontWeight: 'bold', cursor: 'pointer', minHeight: 44 }}>جی ہاں، صاف کریں</button>
                <button onClick={() => setShowClear(false)} style={{ flex: 1, background: 'var(--gray-100)', border: 'none', borderRadius: 'var(--radius-sm)', padding: '.6rem', cursor: 'pointer', minHeight: 44 }}>نہیں</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowClear(true)} style={{ background: 'none', border: '1px solid #ef4444', color: '#ef4444', borderRadius: 'var(--radius-sm)', padding: '.5rem 1.5rem', fontSize: '.82rem', cursor: 'pointer', minHeight: 44 }}>
              🗑️ سب خالی کریں
            </button>
          )}
        </div>
      )}
    </div>
  );
}
