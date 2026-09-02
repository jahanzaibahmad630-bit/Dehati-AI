
/**
 * DehatiAI Institutional Provenance Badge
 * Renders a colored authority badge anchoring every tool to its official source.
 *
 * Props:
 *   type: 'sfri' | 'aari' | 'drap' | 'pest' | 'pcrwr' | 'narc'
 *   helpline: optional helpline number string
 *   compact: boolean — show only icon + short label
 */
const BADGES = {
  sfri: {
    bg: '#f0fdf4', border: '#16a34a', color: '#14532d',
    icon: '🏛️',
    label: 'SFRI پنجاب',
    full: 'ادارہ تحقیقات برائے زرخیزی زمین، پنجاب (SFRI) — کھاد فارمولا',
    url: 'https://www.sfri.gop.pk',
  },
  aari: {
    bg: '#fffbeb', border: '#d97706', color: '#78350f',
    icon: '🌾',
    label: 'AARI فیصل آباد',
    full: 'ایوب زرعی تحقیقاتی ادارہ فیصل آباد (AARI) — فصل کیلنڈر و اقسام',
    url: 'https://www.aari.res.pk',
  },
  drap: {
    bg: '#eff6ff', border: '#2563eb', color: '#1e3a8a',
    icon: '💊',
    label: 'DRAP رجسٹرڈ',
    full: 'ڈرگ ریگولیٹری اتھارٹی آف پاکستان (DRAP) — ویٹرنری ادویات',
    url: 'https://www.dra.gov.pk',
  },
  pest: {
    bg: '#fef3c7', border: '#f59e0b', color: '#78350f',
    icon: '🔬',
    label: 'پیسٹ وارننگ ڈیپٹ',
    full: 'محکمہ آفات نباتات و مالیاتی معیار کیڑے مار ادویات، پنجاب (Pest Warning)',
    url: 'https://www.agripunjab.gov.pk',
  },
  pcrwr: {
    bg: '#f0f9ff', border: '#0284c7', color: '#0c4a6e',
    icon: '☀️',
    label: 'PCRWR / NEPRA',
    full: 'پاکستان کونسل آف ریسرچ ان واٹر ریسورسز (PCRWR) اور NEPRA — سولر معیارات',
    url: 'https://www.pcrwr.gov.pk',
  },
  narc: {
    bg: '#fdf4ff', border: '#9333ea', color: '#581c87',
    icon: '🧬',
    label: 'NARC اسلام آباد',
    full: 'قومی زرعی تحقیقاتی مرکز اسلام آباد (NARC) — اعلیٰ قدر فصلیں',
    url: 'https://www.narc.gov.pk',
  },
};

const nas = { fontFamily: '"Noto Nastaliq Urdu", serif', direction: 'rtl' };

export default function InstitutionalBadge({ type = 'sfri', helpline = null, compact = false }) {
  const b = BADGES[type] || BADGES.sfri;
  return (
    <div style={{
      background: b.bg,
      border: `1.5px solid ${b.border}`,
      borderRadius: 10,
      padding: compact ? '5px 10px' : '8px 12px',
      marginBottom: 10,
      direction: 'rtl',
      display: 'flex',
      alignItems: compact ? 'center' : 'flex-start',
      gap: 8,
      flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: compact ? '1rem' : '1.1rem' }}>{b.icon}</span>
      <div style={{ flex: 1 }}>
        {compact ? (
          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: b.color, ...nas }}>
            📚 ماخذ: {b.label}
          </div>
        ) : (
          <>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: b.color, ...nas }}>
              📚 مستند ماخذ: {b.full}
            </div>
            {helpline && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.68rem', color: b.color, ...nas }}>
                  📞 تصدیق کیلئے مفت ہیلپ لائن:
                </span>
                <a href={`tel:${helpline.replace(/[^0-9]/g, '')}`}
                   style={{ fontSize: '0.72rem', fontWeight: 900, color: 'white', background: b.border, padding: '2px 10px', borderRadius: 20, textDecoration: 'none', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}>
                  📞 {helpline}
                </a>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
