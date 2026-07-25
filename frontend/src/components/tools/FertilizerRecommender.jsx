import { useState } from 'react';
import { askFertilizer } from '../../services/api';
import AIDisclaimer from '../ui/AIDisclaimer';
import { useOffline } from '../../hooks/useOffline';
import MarkdownRenderer from '../MarkdownRenderer';


const CROPS = ['گندم', 'چاول', 'کپاس', 'گنا', 'مکئی', 'آلو', 'ٹماٹر', 'پیاز', 'سرسوں', 'مرچ'];
const SOILS = ['ریتلی', 'چکنی', 'دوہمی', 'شوریدہ / کلری', 'ریڈ سوائل', 'ذرخیز (کالی مٹی)'];
const GROWTH_STAGES = ['بوائی', 'پودا نکلنا (10-20 دن)', 'بڑھوتری (30-60 دن)', 'پھول آنا', 'پھل لگنا', 'پختگی سے پہلے'];

export default function FertilizerRecommender() {
  const [crop, setCrop] = useState('');
  const [soil, setSoil] = useState('');
  const [stage, setStage] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { isOffline } = useOffline();

  const ask = async () => {
    if (isOffline) { setError('انٹرنیٹ نہیں ہے'); return; }
    if (!crop) { setError('فصل منتخب کریں'); return; }
    setLoading(true); setError(''); setResult('');
    try {
      const data = await askFertilizer(crop, soil, stage);
      setResult(data.answer);
    } catch (err) {
      setError(err.message || 'جواب نہیں ملا — دوبارہ کوشش کریں');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-group">
      <div>
        <label className="input-label">فصل</label>
        <select className="input" value={crop} onChange={e => setCrop(e.target.value)} id="fert-crop">
          <option value="">فصل منتخب کریں</option>
          {CROPS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div>
        <label className="input-label">مٹی کی قسم (اختیاری)</label>
        <select className="input" value={soil} onChange={e => setSoil(e.target.value)} id="fert-soil">
          <option value="">مٹی منتخب کریں</option>
          {SOILS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div>
        <label className="input-label">بڑھوتری کا مرحلہ (اختیاری)</label>
        <select className="input" value={stage} onChange={e => setStage(e.target.value)} id="fert-stage">
          <option value="">مرحلہ منتخب کریں</option>
          {GROWTH_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <button className="btn btn-primary btn-full" onClick={ask} disabled={!crop || loading} id="fert-ask-btn">
        {loading ? '...' : '🌱 کھاد کی سفارش لیں'}
      </button>

      {error && <div style={{ color: 'var(--danger)', fontSize: '.875rem', fontWeight: 700 }}>⚠️ {error}</div>}
      {loading && <div className="loading-container"><div className="spinner" /></div>}

      {result && (
        <div className="ai-response-card animate-fade-in-up">
          <div className="ai-response-header">
            <span style={{ fontWeight: 700 }}>🌱 کھاد سفارش</span>
            <AIDisclaimer small />
          </div>
          <MarkdownRenderer text={result} />

        </div>
      )}
    </div>
  );
}
