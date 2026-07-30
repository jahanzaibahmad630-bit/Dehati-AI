import { useState, useRef, useEffect } from 'react';
import { createSpeechEngine, correctUrduAgriPhonetics, requestHardwareMic } from '../utils/speech';

/**
 * VoiceInput — Single-Pass High-Accuracy Speech Capture Component
 *
 * Features:
 * - Single-pass capture: continuous=false, interimResults=false, maxAlternatives=1
 * - Hardware mic constraints: echoCancellation, noiseSuppression, autoGainControl, 44100Hz
 * - Automatic Pakistani Agronomy Phonetic Auto-Correction (correctUrduAgriPhonetics)
 * - Zero word duplication
 * - 48px touch targets for Android compliance
 */
export default function VoiceInput({
  onResult,
  langKey = 'ur',
  label = '🎤 بولیں',
  disabled = false,
  className = '',
  style = {}
}) {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState('');
  const engineRef = useRef(null);

  const startMic = async () => {
    setError('');
    const hasMic = await requestHardwareMic();
    if (!hasMic && !window.SpeechRecognition && !window.webkitSpeechRecognition) {
      setError('مائیک کی اجازت یا سہولت درکار ہے');
      return;
    }

    if (engineRef.current) {
      try { engineRef.current.stop(); } catch {}
    }

    const engine = createSpeechEngine({
      langKey,
      singlePass: true,
      onResult: (text) => {
        const cleaned = correctUrduAgriPhonetics(text);
        if (cleaned && onResult) {
          onResult(cleaned);
        }
        setIsListening(false);
      },
      onStopped: (finalText) => {
        setIsListening(false);
        if (finalText && onResult) {
          const cleaned = correctUrduAgriPhonetics(finalText);
          onResult(cleaned);
        }
      },
      onError: (err) => {
        setIsListening(false);
        setError(err === 'permission_denied' ? 'مائیک اجازت درکار ہے' : 'دوبارہ کوشش کریں');
      }
    });

    engineRef.current = engine;
    if (engine) {
      setIsListening(true);
      engine.start();
    }
  };

  const stopMic = () => {
    if (engineRef.current) {
      try { engineRef.current.stop(); } catch {}
    }
    setIsListening(false);
  };

  const retryMic = () => {
    stopMic();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setTimeout(() => {
      startMic();
    }, 200);
  };

  useEffect(() => {
    return () => {
      if (engineRef.current) {
        try { engineRef.current.stop(); } catch {}
      }
    };
  }, []);

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, ...style }}>
      <button
        type="button"
        onClick={isListening ? stopMic : startMic}
        disabled={disabled}
        className={`btn ${isListening ? 'btn-danger' : 'btn-primary'} ${className}`}
        style={{
          minHeight: 48,
          minWidth: 48,
          borderRadius: 24,
          padding: '10px 18px',
          fontWeight: 800,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
          background: isListening ? '#dc2626' : 'linear-gradient(135deg, #2e5a27, #3a7232)',
          color: 'white',
          border: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          boxShadow: isListening ? '0 0 12px rgba(220,38,38,0.4)' : '0 2px 8px rgba(46,90,39,0.2)',
          transition: 'all 0.2s ease'
        }}
      >
        {isListening ? (
          <>
            <span style={{
              display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
              background: '#ffffff', animation: 'pulse 1s infinite'
            }} />
            <span>⏹️ ریکارڈنگ روکیں</span>
          </>
        ) : (
          <span>{label}</span>
        )}
      </button>

      {error && (
        <button
          type="button"
          onClick={retryMic}
          style={{
            background: 'rgba(217,119,6,0.15)', color: '#d97706',
            border: '1px solid #d97706', borderRadius: 20,
            padding: '6px 12px', fontSize: '.75rem', fontWeight: 700, cursor: 'pointer'
          }}
        >
          🔄 {error} — دوبارہ
        </button>
      )}
    </div>
  );
}
