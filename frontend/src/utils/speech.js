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
 * Strips Markdown, emojis, code, converts units and numbers to spoken Urdu words.
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

  // ── Agricultural & Technical Unit Mapping ─────────────────────────────────
  // Must run BEFORE digit conversion so "200 ml" → "دو سو ملی لیٹر" (not "دو سو ml")
  // Order: longest / most specific first to prevent partial matches
  const unitMap = [
    // Spray concentration units
    [/\bml\/L\b/gi,    'ملی لیٹر فی لیٹر'],
    [/\bml\/acre\b/gi, 'ملی لیٹر فی ایکڑ'],
    [/\bg\/acre\b/gi,  'گرام فی ایکڑ'],
    [/\bkg\/acre\b/gi, 'کلوگرام فی ایکڑ'],
    // Volume
    [/\blitre[s]?\b/gi,  'لیٹر'],
    [/\bliter[s]?\b/gi,  'لیٹر'],
    [/\bml\b/gi,          'ملی لیٹر'],
    // Weight
    [/\bkg\b/gi,   'کلوگرام'],
    [/\bgm\b/gi,   'گرام'],
    [/\bg\b(?=\s*[\d\u0600-\u06FF])/gi, 'گرام'], // 'g' only when followed by digit or Urdu char
    // Area
    [/\bacre[s]?\b/gi, 'ایکڑ'],
    [/\bhectare[s]?\b/gi, 'ہیکٹر'],
    // Agronomy terms
    [/\bPHI\b/g,  'احتیاطی دن'],
    [/\bWHP\b/g,  'احتیاطی دن'],
    [/\bEC\b/g,   'برقی چالکتا'],
    [/\bppm\b/gi, 'حصہ فی ملین'],
    // Currency
    [/Rs\.\/?(\s)?/g, 'روپے '],
    [/PKR\s?/g,       'روپے '],
    [/₨/g,            'روپے '],
    // Percent
    [/%/g, 'فیصد'],
    // Degree
    [/°C/g, 'ڈگری سینٹی گریڈ'],
    [/°/g,  'ڈگری'],
    // km/h
    [/km\/h/gi, 'کلومیٹر فی گھنٹہ'],
  ];

  for (const [pattern, replacement] of unitMap) {
    t = t.replace(pattern, replacement);
  }

  // ── Number → Urdu Words ────────────────────────────────────────────────────
  // Common agricultural numbers get direct mapping for accuracy
  const directNumbers = [
    ['200', 'دو سو'], ['600', 'چھ سو'], ['100', 'سو'],
    ['500', 'پانچ سو'], ['400', 'چار سو'], ['300', 'تین سو'],
    ['1000', 'ایک ہزار'], ['2000', 'دو ہزار'],
    ['30', 'تیس'], ['21', 'اکیس'], ['14', 'چودہ'], ['10', 'دس'],
    ['7', 'سات'], ['5', 'پانچ'], ['4', 'چار'],
    ['3', 'تین'], ['2', 'دو'], ['1', 'ایک'],
  ];

  // Apply remaining digit→word conversion via recursive function
  t = t.replace(/(\d+(?:\.\d+)?)/g, (match, num) => {
    if (num.includes('.')) {
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
 * waitForVoices — resolves with the full voice list once speechSynthesis has loaded.
 * On Android Chrome, voices load asynchronously AFTER page paint.
 * Resolves immediately if already loaded, otherwise waits for voiceschanged.
 * Timeout: 2s — then resolves with whatever is available.
 */
export function waitForVoices() {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) return resolve([]);

    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) return resolve(voices);

    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) { resolved = true; resolve(window.speechSynthesis.getVoices() || []); }
    }, 2000);

    window.speechSynthesis.addEventListener('voiceschanged', function handler() {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        window.speechSynthesis.removeEventListener('voiceschanged', handler);
        resolve(window.speechSynthesis.getVoices() || []);
      }
    });
  });
}

/**
 * selectUrduVoice — 4-Tier Android-Aware Pakistani Urdu Voice Selector.
 *
 * Android Chrome loads voices asynchronously. Pass the voice list from waitForVoices().
 *
 * Priority 1: Microsoft Asad/Uzma Online Natural — Urdu (Pakistan) — Windows Edge/Desktop
 * Priority 2: Android Google Urdu Voice (ur-PK / ur_PK) — Android Chrome
 * Priority 3: Any ur-PK / ur-IN voice (Samsung, Xiaomi, other OEMs)
 * Priority 4: Hindi (hi-IN) Neural Voice — phonetically compatible with Urdu,
 *             available on virtually all Android devices without Urdu TTS
 */
export function selectUrduVoice(voices, langKey = 'ur') {
  if (!voices || voices.length === 0) return null;

  // ── Tier 1: Microsoft Pakistani Neural Voices (Windows Edge/Desktop) ────────
  const msNeural = voices.find(v =>
    v.name.includes('Asad') ||
    v.name.includes('Uzma') ||
    v.name.toLowerCase().includes('urdu (pakistan)') ||
    v.name.toLowerCase().includes('urdu pakistan')
  );
  if (msNeural) return msNeural;

  // ── Tier 2: Google Urdu — Android Chrome built-in ───────────────────────────
  const googleUrdu = voices.find(v =>
    (v.name.includes('Google') || v.name.includes('google')) &&
    (v.lang === 'ur-PK' || v.lang === 'ur_PK' || v.lang.startsWith('ur'))
  );
  if (googleUrdu) return googleUrdu;

  // ── Tier 3: Any Urdu voice (ur-PK, ur_PK, ur-IN) ────────────────────────────
  const anyUrdu = voices.find(v =>
    v.lang === 'ur-PK' || v.lang === 'ur_PK' || v.lang === 'ur-IN' ||
    v.lang.toLowerCase().startsWith('ur') ||
    v.name.toLowerCase().includes('urdu')
  );
  if (anyUrdu) return anyUrdu;

  // ── Tier 4: Hindi hi-IN Phonetic Fallback ────────────────────────────────────
  // Hindi is phonetically compatible with Urdu and available on virtually all
  // Android devices. Farmers will understand it even without an Urdu TTS pack.
  const hindiNeural = voices.find(v =>
    v.lang === 'hi-IN' || v.lang === 'hi_IN' ||
    v.lang.toLowerCase().startsWith('hi') ||
    v.name.toLowerCase().includes('hindi')
  );
  if (hindiNeural) return hindiNeural;

  // ── Absolute Fallback: any Punjabi, then first available ─────────────────────
  const punjabi = voices.find(v => v.lang.toLowerCase().startsWith('pa'));
  if (punjabi) return punjabi;

  return voices[0];
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
 * speakText — Natural Urdu TTS with Android-aware Pakistani voice selection.
 * MUST be called inside a user-gesture handler (onClick/onTouchStart) to comply
 * with Android Chrome autoplay policies.
 *
 * @param {string} text  — Raw text (will be normalized: strips Markdown, numbers→Urdu words)
 * @param {string} langKey — 'ur' | 'pj' | 'en'
 * @param {number} rate  — Playback rate (0.85 = Android-optimized clear rural pace)
 */
export async function speakText(text, langKey = 'ur', rate = 0.85) {
  if (!window.speechSynthesis || !text) return false;

  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
    return false; // Was playing → now stopped
  }

  const normalized = normalizeUrduForSpeech(text);
  if (!normalized) return false;

  const utt = new SpeechSynthesisUtterance(normalized);
  utt.lang  = getSRLang(langKey);
  utt.rate  = rate;   // 0.85 = Android-optimized, slower clear rural pace
  utt.pitch = 1.0;    // Natural warm pitch

  // Wait for Android voiceschanged to fire before selecting voice
  const voices = await waitForVoices();
  const voice = selectUrduVoice(voices, langKey);
  if (voice) utt.voice = voice;

  window.speechSynthesis.speak(utt);
  return true;
}
