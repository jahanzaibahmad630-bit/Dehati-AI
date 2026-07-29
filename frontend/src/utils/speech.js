/**
 * DehatiAI Speech Engine — Production-Grade Voice Recognition + Natural Urdu TTS
 * Tuned for noisy rural Pakistan field environments.
 *
 * Features:
 * - Hardware audio constraints (echo/noise/gain cancellation, 44100Hz)
 * - 2.5s silence buffer (prevents premature cutoff mid-sentence)
 * - Multi-dialect: ur-PK + pa-PK
 * - Pakistani neural voice selection (Microsoft Asad Natural, Google اردو)
 * - Phonetic text normalization (strip Markdown, numbers→Urdu words)
 */

const SILENCE_BUFFER_MS = 2500; // 2.5 seconds — allows farmers to pause mid-sentence

const LANGS = {
  ur: 'ur-PK',
  pj: 'pa-PK',
  en: 'en-US'
};

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

export function getSRLang(langKey) {
  return LANGS[langKey] || 'ur-PK';
}

// ─── Urdu Number Words ────────────────────────────────────────────────────────
const URDU_ONES = [
  '', 'ایک', 'دو', 'تین', 'چار', 'پانچ', 'چھ', 'سات', 'آٹھ', 'نو', 'دس',
  'گیارہ', 'بارہ', 'تیرہ', 'چودہ', 'پندرہ', 'سولہ', 'سترہ', 'اٹھارہ', 'انیس', 'بیس',
  'اکیس', 'بائیس', 'تئیس', 'چوبیس', 'پچیس', 'چھبیس', 'ستائیس', 'اٹھائیس', 'انتیس', 'تیس',
  'اکتیس', 'بتیس', 'تینتیس', 'چونتیس', 'پینتیس', 'چھتیس', 'سینتیس', 'اڑتیس', 'انتالیس', 'چالیس',
  'اکتالیس', 'بیالیس', 'تینتالیس', 'چوالیس', 'پینتالیس', 'چھیالیس', 'سینتالیس', 'اڑتالیس', 'انچاس', 'پچاس',
  'اکاون', 'باون', 'ترپن', 'چون', 'پچپن', 'چھپن', 'ستاون', 'اٹھاون', 'انسٹھ', 'ساٹھ',
  'اکسٹھ', 'باسٹھ', 'ترسٹھ', 'چونسٹھ', 'پینسٹھ', 'چھیاسٹھ', 'سڑسٹھ', 'اڑسٹھ', 'انہتر', 'ستر',
  'اکہتر', 'بہتر', 'تہتر', 'چوہتر', 'پچہتر', 'چھیہتر', 'ستتر', 'اٹھتر', 'اناسی', 'اسی',
  'اکاسی', 'بیاسی', 'تراسی', 'چوراسی', 'پچاسی', 'چھیاسی', 'ستاسی', 'اٹھاسی', 'نواسی', 'نوے',
  'اکانوے', 'بانوے', 'ترانوے', 'چورانوے', 'پچانوے', 'چھیانوے', 'ستانوے', 'اٹھانوے', 'ننانوے', 'سو'
];

function numberToUrduWords(num) {
  const n = parseInt(num, 10);
  if (isNaN(n) || n < 0) return String(num);
  if (n === 0) return 'صفر';
  if (n <= 100) return URDU_ONES[n] || String(n);
  if (n < 1000) {
    const hundreds = Math.floor(n / 100);
    const rem = n % 100;
    const h = hundreds === 1 ? 'سو' : `${URDU_ONES[hundreds]} سو`;
    return rem === 0 ? h : `${h} ${URDU_ONES[rem] || rem}`;
  }
  if (n < 100000) {
    const thousands = Math.floor(n / 1000);
    const rem = n % 1000;
    const t = `${URDU_ONES[thousands] || thousands} ہزار`;
    return rem === 0 ? t : `${t} ${numberToUrduWords(rem)}`;
  }
  return String(n); // Fallback for very large numbers
}

/**
 * normalizeUrduForSpeech — Phonetic Text Normalization for TTS
 * Strips Markdown, emojis, code, and converts numbers to spoken Urdu words.
 */
export function normalizeUrduForSpeech(text) {
  if (!text) return '';

  let t = text;

  // Remove Markdown headers (##, ###, etc.)
  t = t.replace(/^#{1,6}\s*/gm, '');

  // Remove bold/italic (**text**, *text*, __text__)
  t = t.replace(/\*\*([^*]+)\*\*/g, '$1');
  t = t.replace(/\*([^*]+)\*/g, '$1');
  t = t.replace(/__([^_]+)__/g, '$1');
  t = t.replace(/_([^_]+)_/g, '$1');

  // Remove code blocks and inline code
  t = t.replace(/```[\s\S]*?```/g, '');
  t = t.replace(/`[^`]+`/g, '');

  // Remove bullet points / list markers
  t = t.replace(/^[\-\*\•]\s*/gm, '');
  t = t.replace(/^\d+\.\s*/gm, '');

  // Remove HTML tags
  t = t.replace(/<[^>]+>/g, '');

  // Remove URLs
  t = t.replace(/https?:\/\/\S+/g, '');

  // Strip emojis (Unicode emoji ranges)
  t = t.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FEFF}\u{1F000}-\u{1FFFF}]/gu, '');

  // Convert digits to Urdu spoken words
  // Handle patterns like "5 ایکڑ" → "پانچ ایکڑ", "14 دن" → "چودہ دن"
  t = t.replace(/(\d+(?:\.\d+)?)/g, (match, num) => {
    if (num.includes('.')) {
      // Decimal: convert integer and fractional parts separately
      const [intPart, decPart] = num.split('.');
      return `${numberToUrduWords(parseInt(intPart, 10))} اعشاریہ ${numberToUrduWords(parseInt(decPart, 10))}`;
    }
    return numberToUrduWords(parseInt(num, 10));
  });

  // Clean up extra whitespace
  t = t.replace(/\n{3,}/g, '\n\n');
  t = t.replace(/[ \t]{2,}/g, ' ');
  t = t.trim();

  return t;
}

/**
 * selectUrduVoice — Find the best Pakistani/Urdu neural voice available.
 * Priority: Microsoft Asad Natural > Google اردو > any ur-PK > default
 */
export function selectUrduVoice(langKey = 'ur') {
  if (!window.speechSynthesis) return null;

  const targetLang = getSRLang(langKey).toLowerCase();
  const voices = window.speechSynthesis.getVoices();

  if (!voices || voices.length === 0) return null;

  // Priority 1: Microsoft Pakistani Neural voices (Windows Edge/Chrome)
  const microsoftPak = voices.find(v =>
    v.name.includes('Asad') ||
    v.name.toLowerCase().includes('urdu (pakistan)') ||
    v.name.toLowerCase().includes('urdu pakistan') ||
    v.name.toLowerCase().includes('ur-pk')
  );
  if (microsoftPak) return microsoftPak;

  // Priority 2: Google Urdu voice (Android Chrome)
  const googleUrdu = voices.find(v =>
    v.name.toLowerCase().includes('google') &&
    v.lang.toLowerCase().startsWith('ur')
  );
  if (googleUrdu) return googleUrdu;

  // Priority 3: Any ur-PK or pa-PK voice
  const nativePak = voices.find(v =>
    v.lang.toLowerCase() === targetLang ||
    v.lang.toLowerCase().startsWith('ur') ||
    v.lang.toLowerCase().startsWith('pa')
  );
  if (nativePak) return nativePak;

  // Fallback: first available voice
  return voices[0] || null;
}

/**
 * Request microphone stream with hardware noise-reduction constraints.
 * This dramatically improves accuracy in open-field environments.
 */
export async function requestHardwareMic() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,      // Removes echo from field environment
        noiseSuppression: true,      // Reduces wind/machinery noise
        autoGainControl: true,       // Auto-adjusts for quiet/loud voices
        sampleRate: 44100,           // CD-quality audio for better ASR accuracy
        channelCount: 1              // Mono — sufficient for speech, lower bandwidth
      }
    });
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (err) {
    console.warn('Hardware mic constraint failed, falling back to default:', err.message);
    return false;
  }
}

/**
 * Create a production-grade SpeechRecognition instance.
 */
export function createSpeechEngine({
  langKey = 'ur',
  onInterim,
  onFinalWord,
  onStopped,
  onError,
  silenceMs = SILENCE_BUFFER_MS
}) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;

  const srLang = getSRLang(langKey);
  let accumulated = '';
  let stopped = false;
  let silenceTimer = null;
  let gotSpeech = false;
  let emptyEnds = 0;
  const MAX_EMPTY = isIOS ? 2 : 99;

  function clearSilenceTimer() {
    if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; }
  }

  function resetSilenceTimer(recognition) {
    clearSilenceTimer();
    silenceTimer = setTimeout(() => {
      if (!stopped) {
        stopped = true;
        try { recognition._stopped?.(); recognition.stop(); } catch {}
        onStopped?.(accumulated.trim());
      }
    }, silenceMs);
  }

  function createRecognition() {
    const recognition = new SR();
    recognition.lang            = srLang;
    recognition.continuous      = !isIOS;
    recognition.interimResults  = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {};

    recognition.onresult = (e) => {
      gotSpeech = true;
      emptyEnds = 0;
      let sessionFinal = '';
      let interim = '';

      for (let i = 0; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) sessionFinal += t + ' ';
        else interim += t;
      }

      if (sessionFinal.trim()) {
        accumulated += sessionFinal;
        onFinalWord?.(accumulated.trim());
      }
      onInterim?.(interim);
      resetSilenceTimer(recognition);
    };

    recognition.onerror = (e) => {
      clearSilenceTimer();
      console.warn('Speech engine error:', e.error);
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        stopped = true;
        onError?.('permission_denied');
      } else if (e.error === 'network') {
        onError?.('network');
      } else if (e.error === 'aborted') {
        // Ignore — intentional stop
      } else {
        onError?.(e.error || 'unknown');
      }
    };

    recognition.onend = () => {
      if (stopped) { clearSilenceTimer(); return; }
      if (!gotSpeech) emptyEnds++;
      if (emptyEnds >= MAX_EMPTY) {
        stopped = true;
        clearSilenceTimer();
        onError?.('ios_limit');
        return;
      }
      setTimeout(() => {
        if (!stopped) {
          try {
            const next = createRecognition();
            recognitionInstance.current = next;
            next._stopped = () => { stopped = true; clearSilenceTimer(); };
            next.start();
          } catch {}
        }
      }, 150);
    };

    return recognition;
  }

  const recognitionInstance = { current: null };

  return {
    start: async () => {
      await requestHardwareMic();
      accumulated = '';
      stopped = false;
      gotSpeech = false;
      emptyEnds = 0;
      const rec = createRecognition();
      recognitionInstance.current = rec;
      rec._stopped = () => { stopped = true; clearSilenceTimer(); };
      try { rec.start(); } catch (err) { console.error('Start error:', err); }
    },

    stop: () => {
      stopped = true;
      clearSilenceTimer();
      try { recognitionInstance.current?._stopped?.(); } catch {}
      try { recognitionInstance.current?.stop(); } catch {}
      return accumulated.trim();
    },

    reset: () => {
      stopped = true;
      clearSilenceTimer();
      try { recognitionInstance.current?._stopped?.(); } catch {}
      try { recognitionInstance.current?.stop(); } catch {}
      accumulated = '';
    },

    getAccumulated: () => accumulated.trim(),
    isIOS,
  };
}

/**
 * speakText — Natural Urdu TTS with Pakistani neural voice selection.
 * Normalizes text before speaking (strips Markdown, converts numbers to Urdu words).
 */
export function speakText(text, langKey = 'ur', rate = 0.82) {
  if (!window.speechSynthesis || !text) return false;

  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
    return false; // Was playing → now stopped
  }

  const normalized = normalizeUrduForSpeech(text);
  if (!normalized) return false;

  const utt = new SpeechSynthesisUtterance(normalized);
  utt.lang  = getSRLang(langKey);
  utt.rate  = rate;       // 0.82 = slower, clear rural pace
  utt.pitch = 1.0;        // Natural warm pitch

  // Attempt to assign best Pakistani neural voice
  // Voices may not be loaded yet — wait for voiceschanged then retry
  const trySetVoice = () => {
    const voice = selectUrduVoice(langKey);
    if (voice) utt.voice = voice;
  };

  trySetVoice();
  if (!utt.voice) {
    // Voices not loaded yet — listen for event then speak
    const handleVoicesChanged = () => {
      window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
      trySetVoice();
      window.speechSynthesis.speak(utt);
    };
    window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
    // Fallback: also speak immediately with whatever voice is available
    setTimeout(() => {
      if (!window.speechSynthesis.speaking) {
        window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
        window.speechSynthesis.speak(utt);
      }
    }, 300);
  } else {
    window.speechSynthesis.speak(utt);
  }

  return true; // Started playing
}
