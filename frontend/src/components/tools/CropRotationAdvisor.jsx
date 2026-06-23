import { useState } from 'react';
import { ROTATION } from '../../data/crops';

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
