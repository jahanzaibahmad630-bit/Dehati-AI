import { useState } from 'react';
import { normalizeUrduForSpeech, waitForVoices, selectUrduVoice, getSRLang } from '../../utils/speech';

/**
 * AudioPlayer — Natural Urdu Speech Synthesis Button
 *
 * Android Chrome autoplay policy compliance:
 *   ✅ All speech synthesis calls happen inside explicit onClick handlers
 *   ✅ Uses waitForVoices() to handle Android's async voice loading
 *   ✅ Hardware mic constraints already set in createSpeechEngine (echoCancellation, noiseSuppression, autoGainControl)
 *
 * Props:
 *   text     — string to read aloud (normalized: strips Markdown/emojis, numbers→Urdu words)
 *   langKey  — 'ur' | 'pj' | 'en' (default: 'ur')
 *   label    — button label (default: '🔊 سنیں')
 *   compact  — boolean: small 28px icon-only button for message bubbles
 *   style    — optional inline style overrides
 */
export default function AudioPlayer({ text, langKey = 'ur', label = '🔊 سنیں', compact = false, style = {} }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const hasSupport = !!window.speechSynthesis;

  // IMPORTANT: This handler MUST be called from onClick to satisfy Android Chrome
  // autoplay policy. Never call speakText() from useEffect or setTimeout.
  const handlePlay = async () => {
    if (!text || !hasSupport || isPending) return;

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
    utt.rate  = 0.85;   // Android-optimized: slower, clear rural pace
    utt.pitch = 1.0;    // Warm natural pitch

    utt.onstart  = () => { setIsPlaying(true); setIsPending(false); };
    utt.onend    = () => setIsPlaying(false);
    utt.onerror  = () => { setIsPlaying(false); setIsPending(false); };

    // Show pending state while loading Android voices
    setIsPending(true);

    // waitForVoices handles Android's async voiceschanged event.
    // This must happen WITHIN the onClick handler to stay in the user-gesture stack.
    const voices = await waitForVoices();
    const voice = selectUrduVoice(voices, langKey);
    if (voice) utt.voice = voice;

    window.speechSynthesis.cancel(); // Clear any stale utterances
    window.speechSynthesis.speak(utt);
  };

  if (!hasSupport) return null;

  if (compact) {
    return (
      <button
        onClick={handlePlay}
        title={isPlaying ? 'روکیں' : 'سنیں'}
        aria-label={isPlaying ? 'روکیں' : 'سنیں'}
        style={{
          background: isPlaying
            ? 'rgba(245,158,11,0.25)'
            : isPending
              ? 'rgba(245,158,11,0.1)'
              : 'transparent',
          border: `1.5px solid ${isPlaying ? '#f59e0b' : 'rgba(245,158,11,0.5)'}`,
          color: '#f59e0b',
          borderRadius: '50%',
          // 28px visual, but 44px touch target via padding for Android fingers
          width: 28, height: 28,
          minWidth: 44, minHeight: 44,
          padding: 0,
          fontSize: '.75rem',
          cursor: isPending ? 'wait' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'all 0.2s',
          WebkitTapHighlightColor: 'transparent', // Remove Android tap flash
          touchAction: 'manipulation',             // Prevent 300ms tap delay
          ...style
        }}
      >
        {isPending ? '⋯' : isPlaying ? '⏸' : '🔊'}
      </button>
    );
  }

  return (
    <button
      onClick={handlePlay}
      title={isPlaying ? 'روکیں' : 'جواب سنیں'}
      aria-label={isPlaying ? 'روکیں' : 'جواب سنیں'}
      style={{
        background: isPlaying
          ? 'rgba(245,158,11,0.25)'
          : 'rgba(245,158,11,0.12)',
        border: '1.5px solid #f59e0b',
        color: '#f59e0b',
        borderRadius: 20,
        // Minimum 48px height for Android touch targets (WCAG 2.5.5)
        minHeight: 48,
        padding: '10px 16px',
        fontSize: '.82rem',
        fontWeight: 800,
        cursor: isPending ? 'wait' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        transition: 'all 0.2s',
        direction: 'rtl',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
        ...style
      }}
    >
      {isPending ? '⋯ لوڈ...' : isPlaying ? '⏸ روکیں' : label}
    </button>
  );
}
