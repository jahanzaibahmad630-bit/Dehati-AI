import { useState } from 'react';
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

const TOOLS = [
  { id: 'market', icon: '📈', name: 'مارکیٹ قیمتیں', component: MarketPrices },
  { id: 'animal', icon: '🐄', name: 'جانور صحت', component: AnimalHealthAdvisor },
  { id: 'fertilizer', icon: '🌱', name: 'کھاد سفارش', component: FertilizerRecommender },
  { id: 'spray', icon: '💧', name: 'سپرے مقدار', component: SprayDoseCalc },
  { id: 'profit', icon: '💰', name: 'منافع حساب', component: ProfitEstimator },
  { id: 'seed', icon: '🌾', name: 'بیج مقدار', component: SeedRateCalc },
  { id: 'tubewell', icon: '⚡', name: 'ٹیوب ویل خرچ', component: TubeWellCost },
  { id: 'land', icon: '🗺️', name: 'زمین تبدیلی', component: LandConverter },
  { id: 'loan', icon: '🏦', name: 'قرضہ قسط', component: LoanEMICalc },
  { id: 'breakeven', icon: '⚖️', name: 'نقصان حد', component: BreakevenCalc },
  { id: 'harvest', icon: '⏳', name: 'کٹائی گنتی', component: HarvestCountdown },
  { id: 'rotation', icon: '🔄', name: 'فصل چکر', component: CropRotationAdvisor },
  { id: 'livestock', icon: '🐮', name: 'دانہ حساب', component: LivestockFeedCalc },
  { id: 'profile', icon: '👤', name: 'میری پروفائل', component: Profile }
];

export default function MorePage() {
  const [activeTool, setActiveTool] = useState(null);

  const tool = TOOLS.find(t => t.id === activeTool);
  const ToolComponent = tool?.component;

  return (
    <div className="page">
      <div className="page-content">
        <div style={{
          background: 'linear-gradient(135deg, var(--brown-700) 0%, var(--brown-500) 100%)',
          borderRadius: 'var(--radius-xl)', padding: '1.25rem', color: 'white', textAlign: 'center'
        }}>
          <div style={{ fontSize: '2.5rem' }}>⚙️</div>
          <h2 style={{ color: 'white', fontSize: '1.2rem', margin: '.3rem 0' }}>زرعی آلات</h2>
          <p style={{ opacity: .85, fontSize: '.82rem' }}>کیلکولیٹرز اور AI مشورے</p>
        </div>

        <div className="tools-grid">
          {TOOLS.map(t => (
            <button
              key={t.id}
              className="tool-card"
              onClick={() => setActiveTool(t.id)}
              id={`tool-${t.id}`}
            >
              <div className="tool-icon">{t.icon}</div>
              <div className="tool-name">{t.name}</div>
            </button>
          ))}
        </div>
      </div>

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
