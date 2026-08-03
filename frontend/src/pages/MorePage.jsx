import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';
import SprayDoseCalc from '../components/tools/SprayDoseCalc';
import ProfitEstimator from '../components/tools/ProfitEstimator';
import SeedRateCalc from '../components/tools/SeedRateCalc';
import TubeWellCost from '../components/tools/TubeWellCost';
import LandConverter from '../components/tools/LandConverter';
import LoanEMICalc from '../components/tools/LoanEMICalc';
import BreakevenCalc from '../components/tools/BreakevenCalc';
import HarvestCountdown from '../components/tools/HarvestCountdown';
import CropRotationAdvisor from '../components/tools/CropRotationAdvisor';
import LivestockFeedCalc from '../components/tools/LivestockFeedCalc';
import MarketPrices from '../components/tools/MarketPrices';
import AnimalHealthAdvisor from '../components/tools/AnimalHealthAdvisor';
import FertilizerRecommender from '../components/tools/FertilizerRecommender';
import Profile from '../components/tools/Profile';

// Tools that open as bottom sheets
const SHEET_TOOLS = [
  { id: 'market',     icon: '📈', name: 'مارکیٹ قیمتیں', component: MarketPrices,         badge: 'قیمتیں' },
  { id: 'animal',     icon: '🐄', name: 'جانور صحت',      component: AnimalHealthAdvisor  },
  { id: 'fertilizer', icon: '🧪', name: 'NPK کھاد',       component: FertilizerRecommender, badge: '⚡ اسمارٹ' },
  { id: 'spray',      icon: '🌤️', name: 'سپرے موسم',     component: SprayDoseCalc,          badge: '⚡ اسمارٹ' },
  { id: 'profit',     icon: '📊', name: 'ROI منافع',      component: ProfitEstimator,        badge: '⚡ اسمارٹ' },
  { id: 'seed',       icon: '🌱', name: 'ورائٹی بیج',     component: SeedRateCalc,           badge: '⚡ اسمارٹ' },
  { id: 'tubewell',   icon: '☀️', name: 'سولر موازنہ',   component: TubeWellCost,           badge: '⚡ اسمارٹ' },
  { id: 'land',       icon: '🗺️', name: 'زمین تبدیلی',   component: LandConverter        },
  { id: 'loan',       icon: '🏦', name: 'قرضہ قسط',       component: LoanEMICalc          },
  { id: 'breakeven',  icon: '⚖️', name: 'نقصان حد',       component: BreakevenCalc        },
  { id: 'harvest',    icon: '⏳', name: 'کٹائی گنتی',    component: HarvestCountdown     },
  { id: 'rotation',   icon: '🔄', name: 'فصل چکر',        component: CropRotationAdvisor  },
  { id: 'livestock',  icon: '🐮', name: 'دانہ حساب',      component: LivestockFeedCalc    },
  { id: 'profile',    icon: '👤', name: 'میری پروفائل',   component: Profile              },
];


// Tools that navigate to dedicated pages
const NAV_TOOLS = [
  { id: 'crops',       icon: '🌾', name: 'میری فصل',    route: '/crops',        badge: 'نیا' },
  { id: 'price-alert', icon: '🔔', name: 'قیمت الرٹ',   route: '/price-alert',  badge: 'نیا' },
];

export default function MorePage() {
  const [activeTool, setActiveTool] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const token = localStorage.getItem('dehati_token');
      const res = await fetch(`${API_URL}/api/auth/account`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'اکاؤنٹ ختم کرنے میں ناکامی ہوئی');
      }
      localStorage.clear();
      navigate('/auth');
    } catch (e) {
      alert(e.message || 'اکاؤنٹ ختم نہیں ہو سکا — دوبارہ کوشش کریں');
      setDeleting(false);
    }
  };

  const tool = SHEET_TOOLS.find(t => t.id === activeTool);
  const ToolComponent = tool?.component;

  return (
    <div className="page">
      <div className="page-content">
        <div style={{
          background: 'linear-gradient(135deg, var(--green-800) 0%, var(--brown-700) 100%)',
          borderRadius: 'var(--radius-xl)', padding: '1.25rem', color: 'white', textAlign: 'center'
        }}>
          <div style={{ fontSize: '2.5rem' }}>⚙️</div>
          <h2 style={{ color: 'white', fontSize: '1.2rem', margin: '.3rem 0' }}>زرعی آلات</h2>
          <p style={{ opacity: .85, fontSize: '.82rem' }}>کیلکولیٹرز، AI مشورے اور مزید</p>
        </div>

        {/* New dedicated-page tools */}
        <div>
          <div className="section-title" style={{ marginBottom: '.6rem' }}>خاص صفحات</div>
          <div className="tools-grid">
            {NAV_TOOLS.map(t => (
              <button
                key={t.id}
                className="tool-card"
                onClick={() => navigate(t.route)}
                id={`tool-${t.id}`}
                style={{ position: 'relative', borderColor: 'rgba(251,192,45,.5)', background: 'linear-gradient(135deg, #fffdf7, var(--gold-100))' }}
              >
                {t.badge && (
                  <span style={{
                    position: 'absolute', top: '.4rem', left: '.4rem',
                    background: 'var(--gold)', color: '#1a2f0e',
                    fontSize: '.58rem', fontWeight: 800, padding: '.1rem .35rem',
                    borderRadius: 'var(--radius-full)'
                  }}>{t.badge}</span>
                )}
                <div className="tool-icon" style={{ background: 'var(--gold-100)' }}>{t.icon}</div>
                <div className="tool-name">{t.name}</div>
              </button>
            ))}
          </div>
        </div>

        {/* All other tools */}
        <div>
          <div className="section-title" style={{ marginBottom: '.6rem' }}>سب آلات</div>
          <div className="tools-grid">
            {SHEET_TOOLS.map(t => (
              <button
                key={t.id}
                className="tool-card"
                onClick={() => setActiveTool(t.id)}
                id={`tool-${t.id}`}
                style={{ position: 'relative', ...(t.badge?.startsWith('⚡') ? { borderColor: 'rgba(202,138,4,.4)', background: 'linear-gradient(135deg, #fffdf7, #fffbeb)' } : {}) }}
              >
                {t.badge && (
                  <span style={{
                    position: 'absolute', top: '.4rem', left: '.4rem',
                    background: t.badge.startsWith('⚡') ? 'linear-gradient(135deg, #713f12, #ca8a04)' : 'var(--green-700)',
                    color: 'white',
                    fontSize: '.55rem', fontWeight: 800, padding: '.1rem .35rem',
                    borderRadius: 'var(--radius-full)', whiteSpace: 'nowrap'
                  }}>{t.badge}</span>
                )}
                <div className="tool-icon">{t.icon}</div>
                <div className="tool-name">{t.name}</div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: '2rem', padding: '1rem', background: 'white', borderRadius: 'var(--radius-md)', border: '1px solid var(--gray-200)', textAlign: 'center' }}>
          <div style={{ color: 'var(--green-800)', fontWeight: 'bold', marginBottom: '0.75rem' }}>قانون و پرائیویسی (E-E-A-T Trust)</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap', fontSize: '.85rem' }}>
            <button onClick={() => navigate('/privacy')} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', textDecoration: 'underline' }}>🔒 پرائیویسی پالیسی</button>
            <button onClick={() => navigate('/contact')} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', textDecoration: 'underline' }}>📧 رابطہ کریں</button>
            <button onClick={() => navigate('/terms')} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', textDecoration: 'underline' }}>📜 شرائط و ضوابط</button>
          </div>
        </div>

        <div style={{ marginTop: '1rem', padding: '1rem', background: '#fee2e2', borderRadius: 'var(--radius-md)', border: '1px solid #f87171', textAlign: 'center' }}>
          <div style={{ color: '#b91c1c', fontWeight: 'bold', marginBottom: '0.75rem' }}>اکاؤنٹ کا انتظام</div>
          <button 
            onClick={() => setShowDeleteModal(true)} 
            style={{ background: '#dc2626', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1.25rem', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem', width: '100%' }}
          >
            🗑️ اکاؤنٹ ختم کریں
          </button>
        </div>
      </div>

      {showDeleteModal && (
        <div className="overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="bottom-sheet" onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
            <h3 style={{ color: '#dc2626', marginBottom: '1rem' }}>کیا آپ واقعی اپنا اکاؤنٹ ختم کرنا چاہتے ہیں؟ یہ عمل واپس نہیں ہو سکتا۔</h3>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button 
                className="btn btn-outline" 
                style={{ flex: 1 }} 
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
              >
                منسوخ کریں
              </button>
              <button 
                className="btn btn-danger" 
                style={{ flex: 1 }} 
                onClick={handleDeleteAccount}
                disabled={deleting}
              >
                {deleting ? 'ختم ہو رہا ہے...' : 'جی ہاں، ختم کریں'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Sheet */}
      {activeTool && ToolComponent && (
        <div
          className="overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setActiveTool(null); }}
        >
          <div className="bottom-sheet">
            <div className="sheet-handle" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem' }}>{tool.icon} {tool.name}</h3>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setActiveTool(null)}
                id="tool-close-btn"
                style={{ fontSize: '1.3rem', minHeight: '36px', padding: '.3rem .6rem', lineHeight: 1 }}
              >
                ×
              </button>
            </div>
            <ToolComponent />
          </div>
        </div>
      )}
    </div>
  );
}
