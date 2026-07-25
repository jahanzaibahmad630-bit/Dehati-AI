import { useState } from 'react';
import { askAnimalHealth } from '../../services/api';
import AIDisclaimer from '../ui/AIDisclaimer';
import { useOffline } from '../../hooks/useOffline';
import MarkdownRenderer from '../MarkdownRenderer';


const ANIMALS = ['موئشی / بھینس', 'بکری / بھیڑ', 'مرغی', 'گھوڑا / خچر'];
const SYMPTOMS = ['بخار', 'بھوک نہیں', 'دودھ کم', 'پاخانہ ڈھیلا', 'کھانسی', 'جلد کا مسئلہ', 'سوجن', 'کمزوری', 'آنکھ کی تکلیف', 'لنگڑانا'];

export default function AnimalHealthAdvisor() {
  const [animal, setAnimal] = useState('');
  const [symptoms, setSymptoms] = useState([]);
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { isOffline } = useOffline();

  const toggleSymptom = (s) =>
    setSymptoms(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  const ask = async () => {
    if (isOffline) { setError('انٹرنیٹ نہیں ہے'); return; }
    if (!animal) { setError('جانور کی قسم منتخب کریں'); return; }
    setLoading(true); setError(''); setResult('');
    try {
      const data = await askAnimalHealth(animal, symptoms.join(', '), question);
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
        <label className="input-label">جانور کی قسم</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem', flexDirection: 'row-reverse' }}>
          {ANIMALS.map(a => (
            <button
              key={a}
              className={`chip${animal === a ? ' active' : ''}`}
              onClick={() => setAnimal(a)}
              style={{ fontSize: '.8rem' }}
              id={`ah-animal-${a}`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="input-label">علامات (ایک یا زیادہ)</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem', flexDirection: 'row-reverse' }}>
          {SYMPTOMS.map(s => (
            <button
              key={s}
              className={`chip${symptoms.includes(s) ? ' active' : ''}`}
              onClick={() => toggleSymptom(s)}
              style={{ fontSize: '.8rem' }}
              id={`ah-symptom-${s}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="input-label">مزید معلومات (اختیاری)</label>
        <textarea
          className="input"
          rows={2}
          placeholder="مثلاً: دو دن سے کھانا نہیں کھا رہی، بخار 104..."
          value={question}
          onChange={e => setQuestion(e.target.value)}
          style={{ resize: 'vertical' }}
        />
      </div>

      <button className="btn btn-primary btn-full" onClick={ask} disabled={!animal || loading} id="ah-ask-btn">
        {loading ? '🔍 تجزیہ ہو رہا ہے...' : '🔍 AI سے پوچھیں'}
      </button>

      {error && <div style={{ color: 'var(--danger)', fontSize: '.875rem', fontWeight: 700 }}>⚠️ {error}</div>}
      {loading && <div className="loading-container"><div className="spinner" /></div>}

      {result && (
        <div className="ai-response-card animate-fade-in-up">
          <div className="ai-response-header">
            <span style={{ fontWeight: 700 }}>💊 AI مشورہ</span>
            <AIDisclaimer small />
          </div>
          <MarkdownRenderer text={result} />

          <div style={{ marginTop: '.5rem', background: 'var(--danger-light)', borderRadius: 'var(--radius-sm)', padding: '.5rem .75rem', fontSize: '.72rem', color: 'var(--danger)', fontWeight: 700 }}>
            ⚠️ یہ ابتدائی معلومات ہیں — سنگین بیماری میں جانوروں کے ڈاکٹر سے ملیں
          </div>
        </div>
      )}
    </div>
  );
}
