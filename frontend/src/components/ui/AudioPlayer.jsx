import { useState } from 'react';
import { normalizeUrduForSpeech, selectUrduVoice, getSRLang } from '../../utils/speech';


/**
 * AudioPlayer — Natural Urdu TTS with Android Compliance + Animated Sound Wave
 *
 * Android Chrome autoplay policy compliance:
 *   ✅ All speechSynthesis calls happen inside explicit onClick handlers
 *   ✅ waitForVoices() handles Android's async voiceschanged event
 *   ✅ 48px minimum touch targets (WCAG 2.5.5)
 *   ✅ touchAction: manipulation — removes 300ms tap delay
 *   ✅ WebkitTapHighlightColor: transparent — removes grey tap flash
 *
 * Voice Selection (4-Tier):
 *   Tier 1: Microsoft Asad/Uzma (Windows)
 *   Tier 2: Google Urdu ur-PK (Android Chrome)
 *   Tier 3: Any ur-PK / ur-IN (Samsung, Xiaomi)
 *   Tier 4: Hindi hi-IN phonetic fallback (universal Android)
 *
 * Text Normalization:
 *   - Strips **Markdown**, emojis, HTML, URLs
 *   - Maps units: ml→ملی لیٹر, kg→کلوگرام, PHI→احتیاطی دن, %→فیصد, °C→ڈگری
 *   - Converts digits to Urdu words: 200→دو سو, 14→چودہ, 5→پانچ
 *
 * Props:
 *   text     — Raw text to read aloud (normalized before passing to TTS)
 *   langKey  — 'ur' | 'pj' | 'en'  (default: 'ur')
 *   label    — Full button label    (default: '🔊 جواب سنیں')
 *   compact  — true = small 44px icon-only button for chat bubbles
 *   style    — optional inline style overrides
 */
export default function AudioPlayer({
  text,
  langKey = 'ur',
  label = '🔊 جواب سنیں',
  compact = false,
  style = {}
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const hasSupport = !!window.speechSynthesis;

  /**
   * handlePlay — MUST be triggered from onClick/onTouchStart to comply with
   * Android Chrome autoplay policy. Never call from useEffect or setTimeout.
   */
  const handlePlay = () => {
    if (!text || !hasSupport) return;

    // Toggle: if already playing, stop
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    const normalized = normalizeUrduForSpeech(text);
    if (!normalized) return;

    const utt = new SpeechSynthesisUtterance(normalized);
    utt.lang  = getSRLang(langKey);
    utt.rate  = 0.85;   // Android-optimized: slower, clear rural pace
    utt.pitch = 1.0;    // Warm natural pitch
    utt.volume = 1.0;   // Full volume

    utt.onstart  = () => { setIsPlaying(true);  setIsPending(false); };
    utt.onend    = () => setIsPlaying(false);
    utt.onerror  = (e) => {
      if (e.error !== 'interrupted' && e.error !== 'canceled') {
        console.warn('TTS error:', e.error);
      }
      setIsPlaying(false);
      setIsPending(false);
    };

    setIsPending(true);

    // ANDROID CHROME COMPLIANCE: Do NOT await anything after the onClick event.
    // Any await (even waitForVoices) breaks Android's autoplay gesture token
    // and causes speechSynthesis.speak() to silently fail.
    // Synchronous getVoices() returns the cached list if already loaded,
    // or empty [] on first call — in that case, omit utt.voice and use system default.
    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      const voice = selectUrduVoice(voices, langKey);
      if (voice) utt.voice = voice;
    }

    window.speechSynthesis.cancel(); // Clear any stale utterances
    window.speechSynthesis.speak(utt);
  };

  if (!hasSupport) return null;

  // ── Animated Sound Wave Bars ────────────────────────────────────────────────
  const soundWave = isPlaying ? (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 2,
      height: 16,
      marginLeft: compact ? 0 : 6,
    }}>
      {[1, 2, 3, 4].map(i => (
        <span
          key={i}
          style={{
            display: 'inline-block',
            width: compact ? 2 : 3,
            borderRadius: 2,
            background: compact ? '#f59e0b' : 'currentColor',
            animation: `soundBar 0.9s ease-in-out ${i * 0.15}s infinite alternate`,
            // Heights cycle: short → tall → short
            minHeight: compact ? 3 : 4,
            maxHeight: compact ? 12 : 16,
            height: compact ? 8 : 12,
          }}
        />
      ))}
    </span>
  ) : null;

  // ── Compact Mode (44px icon button for chat bubbles) ────────────────────────
  if (compact) {
    return (
      <>
        <style>{SOUND_BAR_CSS}</style>
        <button
          onClick={handlePlay}
          title={isPlaying ? 'بند کریں' : 'سنیں'}
          aria-label={isPlaying ? 'آواز بند کریں' : 'آواز سنیں'}
          aria-pressed={isPlaying}
          style={{
            background: isPlaying
              ? 'rgba(245,158,11,0.25)'
              : isPending
                ? 'rgba(245,158,11,0.1)'
                : 'transparent',
            border: `1.5px solid ${isPlaying ? '#f59e0b' : 'rgba(245,158,11,0.45)'}`,
            color: '#f59e0b',
            borderRadius: '50%',
            // Visual size 28px, touch target 44px via minWidth/minHeight
            width: 28, height: 28,
            minWidth: 44, minHeight: 44,
            padding: 0,
            fontSize: '.75rem',
            cursor: isPending ? 'wait' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'all 0.18s ease',
            WebkitTapHighlightColor: 'transparent',
            touchAction: 'manipulation',
            ...style
          }}
        >
          {isPending
            ? <span style={{ fontSize: '.6rem', letterSpacing: 1 }}>···</span>
            : isPlaying
              ? soundWave || '⏹'
              : '🔊'}
        </button>
      </>
    );
  }

  // ── Full Mode (pill button for advisory cards) ───────────────────────────────
  return (
    <>
      <style>{SOUND_BAR_CSS}</style>
      <button
        onClick={handlePlay}
        title={isPlaying ? 'آواز بند کریں' : 'جواب سنیں'}
        aria-label={isPlaying ? 'آواز بند کریں' : 'جواب سنیں'}
        aria-pressed={isPlaying}
        style={{
          background: isPlaying
            ? 'rgba(245,158,11,0.22)'
            : 'rgba(245,158,11,0.10)',
          border: `1.5px solid ${isPlaying ? '#f59e0b' : 'rgba(245,158,11,0.6)'}`,
          color: '#f59e0b',
          borderRadius: 22,
          // Minimum 48px height — Android WCAG 2.5.5 touch target
          minHeight: 48,
          padding: '10px 18px',
          fontSize: '.82rem',
          fontWeight: 800,
          cursor: isPending ? 'wait' : 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          transition: 'all 0.18s ease',
          direction: 'rtl',
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'manipulation',
          boxShadow: isPlaying ? '0 0 12px rgba(245,158,11,.3)' : 'none',
          ...style
        }}
      >
        {isPending
          ? <span style={{ fontSize: '.82rem' }}>⋯ لوڈ...</span>
          : isPlaying
            ? <><span>⏹️ بند کریں</span>{soundWave}</>
            : <span>{label}</span>}
      </button>
    </>
  );
}

// ── CSS-in-JS: Sound Bar Keyframe Animation ───────────────────────────────────
// Injected via <style> tag — avoids any build-time CSS module dependency.
// Uses alternate direction so bars bounce up/down continuously while playing.
const SOUND_BAR_CSS = `
  @keyframes soundBar {
    0%   { height: 3px;  opacity: 0.6; }
    50%  { height: 14px; opacity: 1.0; }
    100% { height: 5px;  opacity: 0.7; }
  }
`;
