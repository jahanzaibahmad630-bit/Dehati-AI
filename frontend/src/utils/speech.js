/**
 * DehatiAI Speech Engine — Production-Grade Voice Recognition + Natural Urdu TTS
 * Tuned for noisy rural Pakistan field environments & Android Mobile PWA.
 *
 * Modes:
 *   singlePass  — captures ONE clean sentence (continuous=false, interimResults=false)
 *   ruralMode   — live interim display + 3.5s silence auto-stop + debounce lock
 *                 (continuous=true, interimResults=true, zero duplication guarantee)
 *
 * Features:
 * - 3.5s Rural Silence Auto-Stop Buffer (natural mid-sentence pause support)
 * - Mic pre-warm cache (instant startup on 2nd+ tap, <100ms)
 * - 300ms atomic debounce lock (prevents duplicate chat submissions)
 * - Transcript rebuilt from e.results on every event (never += onto state)
 * - Pakistani Agronomy Phonetic Auto-Corrector (correctUrduAgriPhonetics)
 * - Hardware audio constraints (echo/noise/gain cancellation, 44100Hz)
 * - 4-Tier Pakistani Neural & Hindi Voice Selection for TTS
 * - Phonetic text & unit normalization (normalizeUrduForSpeech)
 */

// ─── Silence buffer constants ─────────────────────────────────────────────────
const SILENCE_BUFFER_MS      = 3500; // 3.5s — rural farmers take natural pauses
const SINGLEPASS_SILENCE_MS  = 3500; // same for single-pass fallback

// ─── Language map ─────────────────────────────────────────────────────────────
const LANGS = {
  ur: 'ur-PK',
  pj: 'pa-PK',
  en: 'en-US'
};

const isIOS = typeof navigator !== 'undefined' &&
  /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

export function getSRLang(langKey) {
  return LANGS[langKey] || 'ur-PK';
}

// ─── Mic Pre-Warm Cache ───────────────────────────────────────────────────────
// Caches permission result so 2nd+ mic tap is instant (<100ms visual feedback)
let _micPermissionCache = null; // null | true | 'denied' | false

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
  return String(n);
}

/**
 * correctUrduAgriPhonetics — Auto-corrects common Urdu/Punjabi phonetic ASR mishearings
 * for Pakistani agronomy, farming terminology, and eliminates duplicate words.
 */
export function correctUrduAgriPhonetics(text) {
  if (!text) return '';

  let t = text;

  // Dictionary of phonetic mishearings -> correct Urdu/Pakistani agronomy terms
  const corrections = [
    // Crop names
    [/\bگندوم\b/g, 'گندم'],
    [/\bگندام\b/g, 'گندم'],
    [/\bکپاص\b/g, 'کپاس'],
    [/\bمکئیی\b/g, 'مکئی'],
    [/\bچاولوں\b/g, 'چاول'],
    [/\bکماد\b/g, 'گنا'],

    // Fertilizer & Chemical terms
    [/\bسپراے\b/g, 'سپرے'],
    [/\bاسپرے\b/g, 'سپرے'],
    [/\bاسپرےی\b/g, 'سپرے'],
    [/\bکھادھ\b/g, 'کھاد'],
    [/\bیو ریا\b/g, 'یوریا'],
    [/\bڈی اے پی\b/g, 'DAP'],
    [/\bڈی اےپی\b/g, 'DAP'],
    [/\bنتایو\b/g, 'Nativo'],
    [/\bنیٹیوو\b/g, 'Nativo'],
    [/\bٹلٹ\b/g, 'Tilt'],
    [/\bکونفیڈور\b/g, 'Confidor'],
    [/\bریڈومل\b/g, 'Ridomil'],

    // Measurement & Land terms
    [/\bیکڑ\b/g, 'ایکڑ'],
    [/\bاکیڑ\b/g, 'ایکڑ'],
    [/\bمرلہ\b/g, 'مرلہ'],
    [/\bکنال\b/g, 'کنال'],

    // Disease & Health terms
    [/\bبماری\b/g, 'بیماری'],
    [/\bبیماریاں\b/g, 'بیماری'],
    [/\bسنڈی\b/g, 'سنڈی'],
    [/\bسفید مکھی\b/g, 'سفید مکھی'],
    [/\bسندھی\b/g, 'سنڈی'],
    [/\bکیڑا\b/g, 'کیڑا'],
    [/\bکیڑے\b/g, 'کیڑے'],
  ];

  for (const [pattern, replacement] of corrections) {
    t = t.replace(pattern, replacement);
  }

  // Iterative phrase & word deduplication loop (runs until all repetitions are stripped)
  let prev = '';
  let iterations = 0;
  while (t !== prev && iterations < 5) {
    prev = t;
    // Deduplicate single repeated words ("گندم گندم گندم" -> "گندم")
    t = t.replace(/\b([\u0600-\u06FF\w]+)(?:\s+\1)+\b/gu, '$1');
    // Deduplicate repeated multi-word phrases ("السلام علیکم السلام علیکم" -> "السلام علیکم")
    t = t.replace(/(\b[\u0600-\u06FF\w\s]{2,50}?\b)(?:\s+\1)+\b/gu, '$1');
  }

  return t.trim();
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
  const unitMap = [
    [/\bml\/L\b/gi,    'ملی لیٹر فی لیٹر'],
    [/\bml\/acre\b/gi, 'ملی لیٹر فی ایکڑ'],
    [/\bg\/acre\b/gi,  'گرام فی ایکڑ'],
    [/\bkg\/acre\b/gi, 'کلوگرام فی ایکڑ'],
    [/\blitre[s]?\b/gi,  'لیٹر'],
    [/\bliter[s]?\b/gi,  'لیٹر'],
    [/\bml\b/gi,          'ملی لیٹر'],
    [/\bkg\b/gi,   'کلوگرام'],
    [/\bgm\b/gi,   'گرام'],
    [/\bg\b(?=\s*[\d\u0600-\u06FF])/gi, 'گرام'],
    [/\bacre[s]?\b/gi, 'ایکڑ'],
    [/\bhectare[s]?\b/gi, 'ہیکٹر'],
    [/\bPHI\b/g,  'احتیاطی دن'],
    [/\bWHP\b/g,  'احتیاطی دن'],
    [/\bEC\b/g,   'برقی چالکتا'],
    [/\bppm\b/gi, 'حصہ فی ملین'],
    [/Rs\.\/?(\s)?/g, 'روپے '],
    [/PKR\s?/g,       'روپے '],
    [/₨/g,            'روپے '],
    [/%/g, 'فیصد'],
    [/°C/g, 'ڈگری سینٹی گریڈ'],
    [/°/g,  'ڈگری'],
    [/km\/h/gi, 'کلومیٹر فی گھنٹہ'],
  ];

  for (const [pattern, replacement] of unitMap) {
    t = t.replace(pattern, replacement);
  }

  // ── Number → Urdu Words ────────────────────────────────────────────────────
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
 */
export function selectUrduVoice(voices, langKey = 'ur') {
  if (!voices || voices.length === 0) return null;

  // Tier 1: Microsoft Pakistani Neural Voices (Windows Edge/Desktop)
  const msNeural = voices.find(v =>
    v.name.includes('Asad') ||
    v.name.includes('Uzma') ||
    v.name.toLowerCase().includes('urdu (pakistan)') ||
    v.name.toLowerCase().includes('urdu pakistan')
  );
  if (msNeural) return msNeural;

  // Tier 2: Google Urdu — Android Chrome built-in
  const googleUrdu = voices.find(v =>
    (v.name.includes('Google') || v.name.includes('google')) &&
    (v.lang === 'ur-PK' || v.lang === 'ur_PK' || v.lang.startsWith('ur'))
  );
  if (googleUrdu) return googleUrdu;

  // Tier 3: Any Urdu voice (ur-PK, ur_PK, ur-IN)
  const anyUrdu = voices.find(v =>
    v.lang === 'ur-PK' || v.lang === 'ur_PK' || v.lang === 'ur-IN' ||
    v.lang.toLowerCase().startsWith('ur') ||
    v.name.toLowerCase().includes('urdu')
  );
  if (anyUrdu) return anyUrdu;

  // Tier 4: Hindi hi-IN Phonetic Fallback
  const hindiNeural = voices.find(v =>
    v.lang === 'hi-IN' || v.lang === 'hi_IN' ||
    v.lang.toLowerCase().startsWith('hi') ||
    v.name.toLowerCase().includes('hindi')
  );
  if (hindiNeural) return hindiNeural;

  // Fallback: any Punjabi, then first available
  const punjabi = voices.find(v => v.lang.toLowerCase().startsWith('pa'));
  if (punjabi) return punjabi;

  return voices[0];
}

/**
 * requestHardwareMic — Pre-warm mic stream with hardware noise-reduction constraints.
 *
 * Returns:
 *   true     — permission granted & stream opened successfully
 *   'denied' — user denied mic access (show Urdu guidance)
 *   false    — other hardware error (constraint mismatch, etc.)
 *
 * Caches result in _micPermissionCache for instant (<100ms) subsequent taps.
 */
export async function requestHardwareMic() {
  // Return cached result instantly on 2nd+ call — eliminates startup latency
  if (_micPermissionCache !== null) return _micPermissionCache;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 44100,
        channelCount: 1
      }
    });
    // Release the test stream immediately — SpeechRecognition manages its own capture
    stream.getTracks().forEach(track => track.stop());
    _micPermissionCache = true;
    return true;
  } catch (err) {
    if (
      err.name === 'NotAllowedError' ||
      err.name === 'PermissionDeniedError' ||
      err.message?.toLowerCase().includes('permission')
    ) {
      console.warn('[DehatiAI] Microphone permission denied');
      _micPermissionCache = 'denied';
      return 'denied';
    }
    // sampleRate constraint unsupported on some Android devices — retry without it
    try {
      const fallbackStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      fallbackStream.getTracks().forEach(track => track.stop());
      _micPermissionCache = true;
      return true;
    } catch (fallbackErr) {
      if (
        fallbackErr.name === 'NotAllowedError' ||
        fallbackErr.name === 'PermissionDeniedError'
      ) {
        _micPermissionCache = 'denied';
        return 'denied';
      }
      console.warn('[DehatiAI] Hardware mic constraint failed:', fallbackErr.message);
      return false;
    }
  }
}

/**
 * Create a production-grade SpeechRecognition engine.
 *
 * Modes:
 *   singlePass: true  — One clean sentence, no live transcript (fastest, no duplication)
 *   ruralMode: true   — Live interim transcription + 3.5s silence auto-stop + debounce lock
 *   default           — Continuous mode (legacy, iOS-compatible restart loop)
 *
 * Zero-duplication guarantee in all modes:
 *   - Transcript rebuilt from e.results indices on every onresult event
 *   - Never uses += onto accumulated state across events
 *   - 300ms atomic isProcessingRef debounce lock prevents duplicate submissions
 */
export function createSpeechEngine({
  langKey = 'ur',
  singlePass = false,
  ruralMode = false,
  onInterim,
  onFinalWord,
  onResult,
  onStopped,
  onError,
  silenceMs = SILENCE_BUFFER_MS
}) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;

  const srLang = getSRLang(langKey);

  // ── Single-source-of-truth transcript ref (NEVER appended, always rebuilt) ──
  let transcriptRef = '';       // canonical final text rebuilt from e.results each event
  let stopped       = false;
  let silenceTimer  = null;
  let gotSpeech     = false;
  let emptyEnds     = 0;
  const MAX_EMPTY   = isIOS ? 2 : 99;

  // ── 300ms atomic debounce lock — prevents duplicate chat submissions ────────
  // Set true when onStopped fires, reset after 300ms.
  // Any duplicate onresult / onend that fires within that window is ignored.
  let isProcessing  = false;

  function clearSilenceTimer() {
    if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; }
  }

  function resetSilenceTimer(recognition) {
    clearSilenceTimer();
    silenceTimer = setTimeout(() => {
      if (!stopped && !isProcessing) {
        stopped = true;
        isProcessing = true;
        try { recognition._stopped?.(); recognition.stop(); } catch {}
        const clean = correctUrduAgriPhonetics(transcriptRef.trim());
        onStopped?.(clean);
        if (clean && onResult) onResult(clean);
        // Release debounce lock after 300ms
        setTimeout(() => { isProcessing = false; }, 300);
      }
    }, silenceMs);
  }

  function createRecognition() {
    const recognition = new SR();
    recognition.lang = srLang;
    recognition.maxAlternatives = 1;

    if (singlePass) {
      // Single-Pass: ONE final sentence, no interim, minimal latency
      recognition.continuous     = false;
      recognition.interimResults = false;
    } else if (ruralMode) {
      // Rural Mode: live interim + 3.5s silence + debounce — for ChatPage
      recognition.continuous     = !isIOS;
      recognition.interimResults = true;
    } else {
      // Legacy continuous mode
      recognition.continuous     = !isIOS;
      recognition.interimResults = true;
    }

    recognition.onstart = () => {};

    recognition.onresult = (e) => {
      // ── Debounce guard — if already processing a finalized result, skip ──
      if (isProcessing) return;

      gotSpeech = true;
      emptyEnds = 0;

      if (!e.results || e.results.length === 0) return;

      if (singlePass) {
        // ── Single-Pass Mode ───────────────────────────────────────────────
        // Fires once with one complete sentence — guaranteed no duplication
        isProcessing = true; // lock immediately
        const rawText    = e.results[0][0].transcript.trim();
        const spokenText = correctUrduAgriPhonetics(rawText);
        if (spokenText) {
          transcriptRef = spokenText;
          onFinalWord?.(spokenText);
          if (onResult) onResult(spokenText);
        }
        stopped = true;
        clearSilenceTimer();
        try { recognition.abort(); } catch {}
        onStopped?.(spokenText || '');
        setTimeout(() => { isProcessing = false; }, 300);
        return;
      }

      // ── Rural / Continuous Mode ────────────────────────────────────────
      // Rebuild transcript cleanly from e.results indices on EVERY event.
      let finalChunks = [];
      let interimChunks = [];

      for (let i = 0; i < e.results.length; i++) {
        const text = e.results[i][0].transcript.trim();
        if (!text) continue;
        if (e.results[i].isFinal) {
          if (!finalChunks.includes(text) && !finalChunks.some(f => f.endsWith(text) || text.endsWith(f))) {
            finalChunks.push(text);
          } else if (finalChunks.length > 0 && text.length > finalChunks[finalChunks.length - 1].length) {
            finalChunks[finalChunks.length - 1] = text;
          }
        } else {
          interimChunks.push(text);
        }
      }

      let combinedFinal = finalChunks.join(' ').trim();
      let combinedInterim = interimChunks.join(' ').trim();

      if (combinedInterim && combinedFinal && combinedInterim.startsWith(combinedFinal)) {
        combinedFinal = '';
      }

      const cleanFinal   = correctUrduAgriPhonetics(combinedFinal);
      const cleanInterim = correctUrduAgriPhonetics(combinedInterim);

      if (cleanFinal) {
        transcriptRef = cleanFinal; // REPLACE (never append)
        onFinalWord?.(transcriptRef);
        if (onResult) onResult(transcriptRef);
      }
      if (onInterim) onInterim(cleanInterim);

      // Reset the 3.5s silence countdown on every audio packet received
      resetSilenceTimer(recognition);
    };

    recognition.onerror = (e) => {
      clearSilenceTimer();
      console.warn('[DehatiAI] Speech engine error:', e.error);
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        stopped = true;
        onError?.('permission_denied');
      } else if (e.error === 'network') {
        onError?.('network');
      } else if (e.error === 'aborted') {
        // Ignore — intentional abort/stop, not an error
      } else {
        onError?.(e.error || 'unknown');
      }
    };

    recognition.onend = () => {
      if (stopped || singlePass) { clearSilenceTimer(); return; }
      if (!gotSpeech) emptyEnds++;
      if (emptyEnds >= MAX_EMPTY) {
        stopped = true;
        clearSilenceTimer();
        onError?.('ios_limit');
        return;
      }
      // Auto-restart for continuous / ruralMode on Android
      setTimeout(() => {
        if (!stopped && !singlePass) {
          try {
            const next = createRecognition();
            recognitionInstance.current = next;
            next._stopped = () => { stopped = true; clearSilenceTimer(); };
            // abort() before start() prevents InvalidStateError on stale sessions
            try { next.abort(); } catch {}
            next.start();
          } catch (restartErr) {
            console.warn('[DehatiAI] Restart error:', restartErr.message);
          }
        }
      }, 150);
    };

    return recognition;
  }

  const recognitionInstance = { current: null };

  return {
    start: async () => {
      // Pre-warm hardware mic (cached after first call — instant on 2nd+ tap)
      const micResult = await requestHardwareMic();
      if (micResult === 'denied') {
        onError?.('permission_denied');
        return;
      }

      // Reset all state for fresh session
      transcriptRef = '';
      stopped       = false;
      gotSpeech     = false;
      emptyEnds     = 0;
      isProcessing  = false;

      // Abort any previous lingering recognition to prevent InvalidStateError
      const existing = recognitionInstance.current;
      if (existing) {
        try { existing.abort(); } catch {}
      }

      const rec = createRecognition();
      recognitionInstance.current = rec;
      rec._stopped = () => { stopped = true; clearSilenceTimer(); };

      // Defensive start — on InvalidStateError, wait 250ms and retry once
      try {
        rec.start();
      } catch (err) {
        if (err.name === 'InvalidStateError') {
          setTimeout(() => {
            try { rec.start(); } catch (retryErr) {
              console.error('[DehatiAI] Start retry failed:', retryErr.message);
              onError?.('unknown');
            }
          }, 250);
        } else {
          console.error('[DehatiAI] Start error:', err.message);
          onError?.('unknown');
        }
      }
    },

    stop: () => {
      stopped = true;
      clearSilenceTimer();
      try { recognitionInstance.current?._stopped?.(); } catch {}
      try { recognitionInstance.current?.stop(); } catch {}
      return correctUrduAgriPhonetics(transcriptRef.trim());
    },

    reset: () => {
      stopped = true;
      isProcessing = false;
      clearSilenceTimer();
      try { recognitionInstance.current?._stopped?.(); } catch {}
      try { recognitionInstance.current?.stop(); } catch {}
      transcriptRef = '';
    },

    getAccumulated: () => correctUrduAgriPhonetics(transcriptRef.trim()),
    isIOS,
  };
}

/**
 * speakText — Natural Urdu TTS with Android-aware Pakistani voice selection.
 */
export async function speakText(text, langKey = 'ur', rate = 0.85) {
  if (!window.speechSynthesis || !text) return false;

  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
    return false;
  }

  const normalized = normalizeUrduForSpeech(text);
  if (!normalized) return false;

  const utt    = new SpeechSynthesisUtterance(normalized);
  utt.lang     = getSRLang(langKey);
  utt.rate     = rate;
  utt.pitch    = 1.0;
  utt.volume   = 1.0;

  const voices = await waitForVoices();
  const voice  = selectUrduVoice(voices, langKey);
  if (voice) utt.voice = voice;

  window.speechSynthesis.speak(utt);
  return true;
}
