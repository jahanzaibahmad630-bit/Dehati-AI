import { useState } from 'react';

const ROTATION = {
  'گندم': [
    { crop: 'کپاس', reason: 'بیماری کا چکر توڑتا ہے، مٹی میں نامیاتی مادہ بڑھاتا ہے' },
    { crop: 'مکئی', reason: 'مختلف غذائی ضرورت، مٹی کی ساخت بہتر ہوتی ہے' },
    { crop: 'ماش / مونگ', reason: 'نائٹروجن فکسیشن سے زمین کی زرخیزی بحال کرتی ہے' }
  ],
  'چاول': [
    { crop: 'گندم', reason: 'کلاسک چاول-گندم چکر، روایتی محفوظ پیداوار' },
    { crop: 'سرسوں / کینولا', reason: 'موسم سرما کی بہترین فصل، تیل اور منافع بخش' },
    { crop: 'آلو', reason: 'مختلف غذائی ضرورت، بیماری اور کیڑوں کا چکر توڑتا ہے' }
  ],
  'کپاس': [
    { crop: 'گندم', reason: 'گندم کپاس کے کیڑوں کا قدرتی چکر توڑتی ہے' },
    { crop: 'چنے کی دال', reason: 'نائٹروجن بڑھانا اور ریتلی زمین زرخیز کرنا' },
    { crop: 'مکئی', reason: 'کپاس کے بعد مکئی بہترین پیداوار دیتی ہے' }
  ],
  'آلو': [
    { crop: 'گندم', reason: 'آلو کے بعد پچھیتی گندم کی بہترین فصل' },
    { crop: 'بہاریہ مکئی', reason: 'آلو کھدائی کے فورا بعد زیادہ پیداوار دینے والی فصل' },
    { crop: 'سرسوں / کینولا', reason: 'تیل کے لیے منافع بخش نقد آور فصل' }
  ],
  'مکئی': [
    { crop: 'گندم', reason: 'مکئی-گندم چکر پنجاب میں سب سے کامیاب' },
    { crop: 'سبزی ترکاری', reason: 'زمین کی نمی اور غذائیت کا بھرپور استعمال' },
    { crop: 'دالیں (ماش/مونگ)', reason: 'نائٹروجن واپس کرتی ہیں اور مٹی زرخیز ہوتی ہے' }
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
