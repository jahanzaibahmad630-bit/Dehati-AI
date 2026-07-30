/**
 * DehatiAI Speech Engine — Production-Grade Voice Recognition + Natural Urdu TTS
 * Tuned for noisy rural Pakistan field environments & Android Mobile PWA.
 *
 * Features:
 * - Single-pass & Continuous high-accuracy speech capture without word duplication
 * - Pakistani Agronomy Phonetic Auto-Corrector (correctUrduAgriPhonetics)
 * - Hardware audio constraints (echo/noise/gain cancellation, 44100Hz)
 * - 2.5s silence buffer (prevents premature cutoff mid-sentence)
 * - Multi-dialect: ur-PK + pa-PK
 * - 4-Tier Pakistani Neural & Hindi Voice Selection
 * - Phonetic text & unit normalization (normalizeUrduForSpeech)
 */

const SILENCE_BUFFER_MS = 2500; // 2.5 seconds — allows farmers to pause mid-sentence

const LANGS = {
  ur: 'ur-PK',
  pj: 'pa-PK',
  en: 'en-US'
};

const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

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

  // Deduplicate repeated adjacent identical single words ("گندم گندم" -> "گندم")
  t = t.replace(/\b([\u0600-\u06FF\w]+)\s+\1\b/gu, '$1');

  // Deduplicate repeated multi-word phrases ("فصل کو پانی کب لگائیں فصل کو پانی کب لگائیں" -> "فصل کو پانی کب لگائیں")
  t = t.replace(/(\b[\u0600-\u06FF\w\s]{3,35}?\b)\s+\1\b/gu, '$1');
  t = t.replace(/(\b[\u0600-\u06FF\w\s]{3,35}?\b)\s+\1\b/gu, '$1');

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
 * Request microphone stream with hardware noise-reduction constraints.
 * Returns:
 *   true     — permission granted & stream opened successfully
 *   'denied' — user denied mic access (show Urdu guidance)
 *   false    — other hardware error (constraint mismatch, etc.)
 */
export async function requestHardwareMic() {
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
    return true;
  } catch (err) {
    if (
      err.name === 'NotAllowedError' ||
      err.name === 'PermissionDeniedError' ||
      err.message?.toLowerCase().includes('permission')
    ) {
      console.warn('[DehatiAI] Microphone permission denied');
      return 'denied';
    }
    // sampleRate constraint unsupported on some Android devices — retry without it
    try {
      const fallbackStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      fallbackStream.getTracks().forEach(track => track.stop());
      return true;
    } catch (fallbackErr) {
      if (
        fallbackErr.name === 'NotAllowedError' ||
        fallbackErr.name === 'PermissionDeniedError'
      ) return 'denied';
      console.warn('[DehatiAI] Hardware mic constraint failed:', fallbackErr.message);
      return false;
    }
  }
}

/**
 * Create a production-grade SpeechRecognition instance.
 * Supports Single-Pass High-Accuracy mode & Continuous mode without word duplication.
 */
export function createSpeechEngine({
  langKey = 'ur',
  singlePass = false,
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
        const clean = correctUrduAgriPhonetics(accumulated.trim());
        onStopped?.(clean);
        if (clean && onResult) onResult(clean);
      }
    }, silenceMs);
  }

  function createRecognition() {
    const recognition = new SR();
    recognition.lang            = srLang;
    recognition.continuous      = singlePass ? false : !isIOS;
    recognition.interimResults  = singlePass ? false : true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {};

    recognition.onresult = (e) => {
      gotSpeech = true;
      emptyEnds = 0;

      if (!e.results || e.results.length === 0) return;

      if (singlePass) {
        // Single-Pass Mode: exact final sentence from results[0]
        const rawText = e.results[0][0].transcript.trim();
        const spokenText = correctUrduAgriPhonetics(rawText);
        if (spokenText) {
          accumulated = spokenText;
          if (onResult) onResult(spokenText);
        }
        stopped = true;
        clearSilenceTimer();
        try { recognition.abort(); } catch {}
        onStopped?.(spokenText);
        return;
      }

      // Continuous Mode: Process final & interim text cleanly without word duplication
      let fullFinalText = '';
      let currentInterimText = '';

      for (let i = 0; i < e.results.length; i++) {
        const chunk = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          fullFinalText += chunk + ' ';
        } else {
          currentInterimText += chunk + ' ';
        }
      }

      const cleanFinal = correctUrduAgriPhonetics(fullFinalText.trim());
      const cleanInterim = correctUrduAgriPhonetics(currentInterimText.trim());

      if (cleanFinal) {
        accumulated = cleanFinal;
        onFinalWord?.(accumulated);
        if (onResult) onResult(accumulated);
      }
      if (onInterim) onInterim(cleanInterim);
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
        // Ignore — intentional abort/stop
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
      setTimeout(() => {
        if (!stopped && !singlePass) {
          try {
            const next = createRecognition();
            recognitionInstance.current = next;
            next._stopped = () => { stopped = true; clearSilenceTimer(); };
            // abort() before start() prevents InvalidStateError if previous session lingered
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
      // Pre-warm hardware mic and check permissions before starting SpeechRecognition
      const micResult = await requestHardwareMic();
      if (micResult === 'denied') {
        onError?.('permission_denied');
        return;
      }

      accumulated = '';
      stopped = false;
      gotSpeech = false;
      emptyEnds = 0;

      // Abort any previous lingering recognition to prevent InvalidStateError
      const existing = recognitionInstance.current;
      if (existing) {
        try { existing.abort(); } catch {}
      }

      const rec = createRecognition();
      recognitionInstance.current = rec;
      rec._stopped = () => { stopped = true; clearSilenceTimer(); };

      // Defensive start — catches InvalidStateError if the browser is still cleaning up
      try {
        rec.start();
      } catch (err) {
        if (err.name === 'InvalidStateError') {
          // Brief cooldown then retry once
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
      return correctUrduAgriPhonetics(accumulated.trim());
    },

    reset: () => {
      stopped = true;
      clearSilenceTimer();
      try { recognitionInstance.current?._stopped?.(); } catch {}
      try { recognitionInstance.current?.stop(); } catch {}
      accumulated = '';
    },

    getAccumulated: () => correctUrduAgriPhonetics(accumulated.trim()),
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

  const utt = new SpeechSynthesisUtterance(normalized);
  utt.lang  = getSRLang(langKey);
  utt.rate  = rate;
  utt.pitch = 1.0;
  utt.volume = 1.0;

  const voices = await waitForVoices();
  const voice = selectUrduVoice(voices, langKey);
  if (voice) utt.voice = voice;

  window.speechSynthesis.speak(utt);
  return true;
}
