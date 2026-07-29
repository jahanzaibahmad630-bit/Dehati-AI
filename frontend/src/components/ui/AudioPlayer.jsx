import { useState } from 'react';
import { normalizeUrduForSpeech, selectUrduVoice, getSRLang } from '../../utils/speech';

/**
 * AudioPlayer — Natural Urdu Speech Synthesis Button
 * Uses Pakistani neural voice (Microsoft Asad / Google اردو) with text normalization.
 *
 * Props:
 *   text     — string to be read aloud (will be normalized: strips Markdown/emojis/numbers→Urdu words)
 *   langKey  — 'ur' | 'pj' | 'en' (default: 'ur')
 *   label    — button label text (default: '🔊 سنیں')
 *   compact  — boolean: if true, renders as a small icon-only button
 *   style    — optional inline style overrides
 */
export default function AudioPlayer({ text, langKey = 'ur', label = '🔊 سنیں', compact = false, style = {} }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const hasSupport = !!window.speechSynthesis;

  const handlePlay = () => {
    if (!text || !hasSupport) return;

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    // Normalize text: strip Markdown, emojis, convert numbers to Urdu words
    const normalized = normalizeUrduForSpeech(text);
    if (!normalized) return;

    const utt = new SpeechSynthesisUtterance(normalized);
    utt.lang  = getSRLang(langKey);
    utt.rate  = 0.82;   // Slower, clear rural pace
    utt.pitch = 1.0;    // Warm human pitch

    utt.onstart  = () => setIsPlaying(true);
    utt.onend    = () => setIsPlaying(false);
    utt.onerror  = () => setIsPlaying(false);

    // Assign Pakistani neural voice if available
    const assignVoiceAndSpeak = () => {
      const voice = selectUrduVoice(langKey);
      if (voice) utt.voice = voice;
      window.speechSynthesis.cancel(); // Cancel any active utterances
      window.speechSynthesis.speak(utt);
    };

    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      assignVoiceAndSpeak();
    } else {
      // Voices not loaded yet — wait for event
      const handler = () => {
        window.speechSynthesis.removeEventListener('voiceschanged', handler);
        assignVoiceAndSpeak();
      };
      window.speechSynthesis.addEventListener('voiceschanged', handler);
      // Fallback: speak after 400ms regardless
      setTimeout(() => {
        window.speechSynthesis.removeEventListener('voiceschanged', handler);
        if (!window.speechSynthesis.speaking) assignVoiceAndSpeak();
      }, 400);
    }
  };

  if (!hasSupport) return null;

  if (compact) {
    return (
      <button
        onClick={handlePlay}
        title={isPlaying ? 'روکیں' : 'سنیں'}
        style={{
          background: isPlaying ? 'rgba(245,158,11,0.2)' : 'transparent',
          border: `1.5px solid ${isPlaying ? '#f59e0b' : 'rgba(245,158,11,0.5)'}`,
          color: '#f59e0b',
          borderRadius: '50%',
          width: 28, height: 28,
          fontSize: '.75rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'all 0.2s',
          ...style
        }}
      >
        {isPlaying ? '⏸' : '🔊'}
      </button>
    );
  }

  return (
    <button
      onClick={handlePlay}
      title={isPlaying ? 'روکیں' : 'جواب سنیں'}
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
      {isPlaying ? '⏸ روکیں' : label}
    </button>
  );
}
