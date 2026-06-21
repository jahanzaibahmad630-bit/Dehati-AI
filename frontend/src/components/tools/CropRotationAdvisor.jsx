import { useState } from 'react';

const ROTATION = {
  'گندم': [
    { crop: 'کپاس', reason: 'بیماریکا چکر توڑتا ہے، مٹی میں کاربن بڑھاتا ہے' },
    { crop: 'مکئی', reason: 'مختلف غذائی ضرورت، مٹی کی صحت بہتر ہوتی ہے' },
    { crop: 'ماش / موڑ', reason: 'نائٹروجن واپس کرتی ہے، اگلی فصل بہتر ہوگی' }
  ],
  'چاول': [
    { crop: 'گندم', reason: 'کلاسک چاول-گندم چکر، مٹی کی صحت برقرار' },
    { crop: 'سرسوں', reason: 'موسم سرما کی اچھی فصل، تیل کے لیے منافع بخش' },
    { crop: 'آلو', reason: 'مختلف غذائی ضرورت، بیماری کا چکر توڑتا ہے' }
  ],
  'کپاس': [
    { crop: 'گندم', reason: 'گندم کپاس کی بیماری توڑتا ہے' },
    { crop: 'چنے کی دال', reason: 'نائٹروجن بڑھانا، زمین خصب' },
    { crop: 'مکئی', reason: 'کپاس کے بعد مکئی اچھی پیداوار دیتی ہے' }
  ],
  'آلو': [
    { crop: 'گندم', reason: 'آلو کے بعد گندم کی بہترین فصل' },
    { crop: 'پیاز', reason: 'ایک ہی موسم میں دو منافع بخش فصلیں' },
    { crop: 'سرسوں', reason: 'تیل کے لیے منافع بخش، آلو کے بعد آتا ہے' }
  ],
  'مکئی': [
    { crop: 'گندم', reason: 'مکئی-گندم چکر بہت عام' },
    { crop: 'سبزی ترکاری', reason: 'زمین کی نمی برقرار رہتی ہے' },
    { crop: 'دالیں', reason: 'نائٹروجن واپس کرتی ہیں، مٹی خصب ہوتی ہے' }
  ],
  'گنا': [
    { crop: 'گندم', reason: 'گنے کے بعد گندم، نمی اور غذائیت باقی رہتی ہے' },
    { crop: 'آلو', reason: 'آلو گنے کی زمین میں اچھا ہوتا ہے' },
    { crop: 'مکئی', reason: 'گرمی کی فصل، گنے کے بعد اچھی' }
  ]
};

export default function CropRotationAdvisor() {
  const [crop, setCrop] = useState('');
  const suggestions = ROTATION[crop] || [];

  return (
    <div className="form-group">
      <div>
        <label className="input-label">موجودہ فصل</label>
        <select className="input" value={crop} onChange={e => setCrop(e.target.value)} id="rotation-crop">
          <option value="">فصل منتخب کریں</option>
          {Object.keys(ROTATION).map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {suggestions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
          <div style={{ fontWeight: 700, color: 'var(--text-secondary)', fontSize: '.9rem' }}>
            اگلی فصل کی سفارش:
          </div>
          {suggestions.map((s, i) => (
            <div key={i} style={{ background: 'var(--green-100)', borderRadius: 'var(--radius-sm)', padding: '.875rem', borderRight: '4px solid var(--green-500)' }}>
              <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '.3rem', color: 'var(--green-800)' }}>
                {i + 1}. {s.crop}
              </div>
              <div style={{ fontSize: '.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{s.reason}</div>
            </div>
          ))}
        </div>
      )}

      {!crop && (
        <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '.9rem' }}>
          🔄 اوپر سے اپنی موجودہ فصل منتخب کریں
        </div>
      )}
    </div>
  );
}
