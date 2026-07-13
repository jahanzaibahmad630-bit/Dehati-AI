/**
 * InstallBanner.jsx
 *
 * Shown at the bottom of the screen when the app is installable.
 * Dismissible — remembers dismissal in localStorage for 3 days.
 * Also shows a persistent "Install App" option in the header menu.
 */
import { useState, useEffect } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

const DISMISS_KEY  = 'dehati_install_dismissed';
const DISMISS_DAYS = 3;

function wasDismissedRecently() {
  try {
    const ts = localStorage.getItem(DISMISS_KEY);
    if (!ts) return false;
    return Date.now() - Number(ts) < DISMISS_DAYS * 86400000;
  } catch { return false; }
}

export default function InstallBanner() {
  const { canInstall, isInstalled, isInstalling, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(wasDismissedRecently);
  const [installed, setInstalled] = useState(false);

  const handleInstall = async () => {
    const ok = await install();
    if (ok) setInstalled(true);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
  };

  if (!canInstall || dismissed || isInstalled || installed) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 'calc(64px + env(safe-area-inset-bottom, 0px))',  /* above bottom nav */
      left: 12,
      right: 12,
      zIndex: 9000,
      background: 'linear-gradient(135deg, #1a3a0f 0%, #2F4A1E 100%)',
      borderRadius: 16,
      padding: '14px 16px',
      boxShadow: '0 8px 32px rgba(0,0,0,.35)',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      animation: 'slideUpFade .35s ease',
    }}>
      {/* Icon */}
      <div style={{
        width: 48, height: 48, borderRadius: 12, flexShrink: 0,
        background: '#FBF3E1', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.6rem'
      }}>
        🌾
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          color: '#FBF3E1', fontWeight: 800, fontSize: '.9rem',
          direction: 'rtl', lineHeight: 1.3
        }}>
          ایپ انسٹال کریں — مفت!
        </div>
        <div style={{
          color: 'rgba(251,243,225,.7)', fontSize: '.72rem',
          direction: 'rtl', marginTop: 2, lineHeight: 1.4
        }}>
          بغیر انٹرنیٹ بھی کام کرے گی · ہوم اسکرین پر آئیکن
        </div>
      </div>

      {/* Install button */}
      <button
        onClick={handleInstall}
        disabled={isInstalling}
        id="pwa-install-btn"
        style={{
          background: '#FBF3E1',
          color: '#2F4A1E',
          border: 'none',
          borderRadius: 10,
          padding: '8px 14px',
          fontWeight: 800,
          fontSize: '.8rem',
          cursor: isInstalling ? 'wait' : 'pointer',
          flexShrink: 0,
          whiteSpace: 'nowrap',
          opacity: isInstalling ? 0.7 : 1,
        }}
      >
        {isInstalling ? '...' : 'انسٹال'}
      </button>

      {/* Dismiss X */}
      <button
        onClick={handleDismiss}
        id="pwa-dismiss-btn"
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'rgba(251,243,225,.6)', fontSize: '1.1rem',
          padding: '4px', flexShrink: 0, lineHeight: 1
        }}
        aria-label="بند کریں"
      >
        ✕
      </button>
    </div>
  );
}
