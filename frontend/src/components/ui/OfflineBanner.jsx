import { useEffect, useState } from 'react';
import { useOffline } from '../../hooks/useOffline';
import { processOfflineQueue, getOfflineQueue } from '../../services/offlineDB';
import { askAI } from '../../services/api';

export default function OfflineBanner() {
  const { isOffline } = useOffline();
  const [syncToast, setSyncToast] = useState('');

  useEffect(() => {
    const handleOnline = async () => {
      const queue = getOfflineQueue();
      if (queue.length > 0) {
        setSyncToast(`🟢 انٹرنیٹ بحال ہو گیا — ${queue.length} محفوظ شدہ سوالات سنک ہو رہے ہیں...`);
        await processOfflineQueue(
          async (q) => {
            const res = await askAI(q);
            return res?.answer || null;
          },
          (q) => {
            setSyncToast(`✅ سوال کا جواب مل گیا: "${q.slice(0, 25)}..."`);
            setTimeout(() => setSyncToast(''), 4000);
          }
        );
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  return (
    <>
      {syncToast && (
        <div
          className="animate-fade-in-down"
          style={{
            background: '#15803d', color: 'white', padding: '.65rem 1rem',
            textAlign: 'center', fontSize: '.82rem', fontWeight: 800,
            fontFamily: '"Noto Nastaliq Urdu", serif', direction: 'rtl',
            boxShadow: '0 4px 12px rgba(21,128,61,0.3)', position: 'sticky', top: 0, zIndex: 99
          }}
        >
          {syncToast}
        </div>
      )}

      {isOffline && (
        <div
          className="offline-banner"
          role="alert"
          aria-live="polite"
          style={{
            background: 'linear-gradient(135deg, #162410 0%, #2e5a27 100%)',
            color: '#fbc02d', borderBottom: '1px solid #3a7232',
            padding: '.65rem 1rem', fontFamily: '"Noto Nastaliq Urdu", serif',
            fontSize: '.82rem', fontWeight: 800, display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: '.5rem', direction: 'rtl'
          }}
        >
          <span>📵</span>
          <span>⚡ 0ms آف لائن موڈ — 110 FAQ، ویٹرنری گائیڈ اور کیلکولیٹرز فعال ہیں</span>
        </div>
      )}
    </>
  );
}
