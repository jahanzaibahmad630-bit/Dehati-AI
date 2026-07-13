/**
 * usePWAInstall.js
 * 
 * Captures the browser's beforeinstallprompt event so we can show
 * our own install button instead of waiting for Chrome's default banner.
 * Also detects if the app is already installed (standalone mode).
 */
import { useState, useEffect } from 'react';

export function usePWAInstall() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled]     = useState(false);
  const [isInstalling, setIsInstalling]   = useState(false);

  useEffect(() => {
    // Already running as installed PWA?
    if (window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true) {
      setIsInstalled(true);
      return;
    }

    const handler = (e) => {
      e.preventDefault(); // stop Chrome's auto-prompt
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (!installPrompt) return false;
    setIsInstalling(true);
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    setIsInstalling(false);
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setInstallPrompt(null);
    }
    return outcome === 'accepted';
  };

  return { canInstall: !!installPrompt && !isInstalled, isInstalled, isInstalling, install };
}
