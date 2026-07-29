import { useState, useRef } from 'react';
import { speakText } from '../../utils/speech';

/**
 * AudioPlayer — Urdu/Punjabi Speech Synthesis Audio Button
 * Reusable "جواب سنیں" button for DehatiAI prescription cards.
 *
 * Props:
 *   text     — string to be read aloud
 *   langKey  — 'ur' | 'pj' | 'en' (default: 'ur')
 *   label    — button label text (default: '🔊 جواب سنیں')
 *   style    — optional inline style overrides
 */
export default function AudioPlayer({ text, langKey = 'ur', label = '🔊 جواب سنیں', style = {} }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const hasSupport = !!window.speechSynthesis;

  const handlePlay = () => {
    if (!text || !hasSupport) return;

    if (isPlaying) {
      // Stop playback
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = langKey === 'pj' ? 'pa-PK' : langKey === 'en' ? 'en-US' : 'ur-PK';
    utt.rate = 0.85;
    utt.onstart  = () => setIsPlaying(true);
    utt.onend    = () => setIsPlaying(false);
    utt.onerror  = () => setIsPlaying(false);
    window.speechSynthesis.cancel(); // cancel any active utterances first
    window.speechSynthesis.speak(utt);
  };

  if (!hasSupport) return null;

  return (
    <button
      onClick={handlePlay}
      title={isPlaying ? 'بند کریں' : 'نسخہ سنیں'}
      style={{
        background: isPlaying
          ? 'rgba(245,158,11,0.25)'
          : 'rgba(245,158,11,0.12)',
        border: '1.5px solid #f59e0b',
        color: '#f59e0b',
        borderRadius: 20,
        padding: '6px 14px',
        fontSize: '.82rem',
        fontWeight: 800,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        transition: 'all 0.2s',
        direction: 'rtl',
        ...style
      }}
    >
      {isPlaying ? '⏸ بند کریں' : label}
    </button>
  );
}
