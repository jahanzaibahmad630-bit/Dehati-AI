import { useState, useCallback } from 'react';

export function usePermission(type) {
  // type: 'microphone' | 'geolocation'
  const [status, setStatus] = useState('prompt'); // 'prompt' | 'granted' | 'denied'
  const [showPrePrompt, setShowPrePrompt] = useState(false);
  const [showDeniedModal, setShowDeniedModal] = useState(false);

  const checkPermission = useCallback(async () => {
    try {
      const permName = type === 'microphone' ? 'microphone' : 'geolocation';
      const result = await navigator.permissions.query({ name: permName });
      setStatus(result.state);
      return result.state;
    } catch {
      return 'prompt';
    }
  }, [type]);

  const requestWithPrePrompt = useCallback(async (onGranted, onDenied) => {
    // Check current state first
    const current = await checkPermission();

    if (current === 'granted') {
      setStatus('granted');
      onGranted?.();
      return;
    }

    if (current === 'denied') {
      setShowDeniedModal(true);
      onDenied?.();
      return;
    }

    // Show our pre-prompt explanation before native dialog
    setShowPrePrompt(true);

    // Store callbacks for use after user acknowledges pre-prompt
    window._dehatiPermCb = { onGranted, onDenied };
  }, [checkPermission]);

  const proceedAfterPrePrompt = useCallback(async () => {
    setShowPrePrompt(false);
    const { onGranted, onDenied } = window._dehatiPermCb || {};

    try {
      if (type === 'microphone') {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(t => t.stop());
        setStatus('granted');
        onGranted?.();
      } else if (type === 'geolocation') {
        await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 });
        });
        setStatus('granted');
        onGranted?.();
      }
    } catch {
      setStatus('denied');
      setShowDeniedModal(true);
      onDenied?.();
    }
  }, [type]);

  const dismissDeniedModal = () => setShowDeniedModal(false);
  const dismissPrePrompt = () => setShowPrePrompt(false);

  return {
    status,
    showPrePrompt,
    showDeniedModal,
    requestWithPrePrompt,
    proceedAfterPrePrompt,
    dismissPrePrompt,
    dismissDeniedModal,
    checkPermission
  };
}

// Pre-prompt messages
export const PERMISSION_MESSAGES = {
  microphone: {
    title: '🎤 مائیک کی ضرورت',
    body: 'آپ کا سوال اردو میں سننے کے لیے مائیک کی اجازت درکار ہے۔ اگلی اسکرین پر "Allow" دبائیں۔',
    deniedTitle: 'مائیک بند ہے',
    deniedBody: 'مائیک کی اجازت دینے کے لیے:',
    deniedStepsChromeAndroid: [
      'پتے کی بار میں 🔒 آئیکن دبائیں',
      '"Permissions" → "Microphone" → "Allow"',
      'صفحہ دوبارہ لوڈ کریں'
    ],
    deniedStepsIOS: [
      'Settings → Safari کھولیں',
      '"Microphone" → "Allow" کریں',
      'واپس آ کر دوبارہ کوشش کریں'
    ]
  },
  geolocation: {
    title: '📍 جگہ کی ضرورت',
    body: 'آپ کے علاقے کا موسم دیکھنے کے لیے مقام کی اجازت درکار ہے۔',
    deniedTitle: 'جگہ بند ہے',
    deniedBody: 'مقام کی اجازت دینے کے لیے:',
    deniedStepsChromeAndroid: [
      'پتے کی بار میں 🔒 آئیکن دبائیں',
      '"Permissions" → "Location" → "Allow"',
      'صفحہ دوبارہ لوڈ کریں'
    ],
    deniedStepsIOS: [
      'Settings → Safari کھولیں',
      '"Location" → "Allow" کریں',
      'واپس آ کر دوبارہ کوشش کریں'
    ]
  }
};
