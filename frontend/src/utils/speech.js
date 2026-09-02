/**
 * DehatiAI Speech Engine — Production-Grade Voice Recognition + Natural Urdu TTS
 * Tuned for noisy rural Pakistan field environments & Android Mobile PWA.
 *
 * Android Chrome Fix:
 *   - continuous = false on Android (continuous=true deadlocks Google Speech Services)
 *   - interimResults = true (live transcript appears character-by-character)
 *   - onend auto-restarts recognition so farmers can speak multi-sentence answers
 *   - onStopped only fires after 3.5s silence or explicit stop — NEVER on mid-sentence onend
 *   - All stop/cancel paths use recognition.abort() not stop() (0ms vs infinite buffer wait)
 *   - Event handlers are stripped on reset/stop to prevent zombie callbacks
 *   - recognitionInstance is a persistent ref so GC cannot destroy active sessions
 */

// ─── Constants ────────────────────────────────────────────────────────────────
const SILENCE_BUFFER_MS = 3500; // 3.5s — rural farmers pause mid-sentence naturally

// ─── Language map ─────────────────────────────────────────────────────────────
const LANGS = { ur: 'ur-PK', pj: 'pa-PK', en: 'en-US' };

const isIOS = typeof navigator !== 'undefined' &&
  /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

// Android Chrome: continuous=true causes Google Speech Services audio deadlock.
// Must force continuous=false on Android. onend auto-restarts instead.
const isAndroid = typeof navigator !== 'undefined' &&
  /Android/i.test(navigator.userAgent);

export function getSRLang(langKey) {
  return LANGS[langKey] || 'ur-PK';
}

// ─── Mic Permission Cache ─────────────────────────────────────────────────────
let _micPermissionCache = null;

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
 * correctUrduAgriPhonetics — Auto-corrects Urdu/Punjabi phonetic ASR mishearings
 * and eliminates duplicate words/phrases from speech recognition output.
 */
export function correctUrduAgriPhonetics(text) {
  if (!text) return '';

  let t = text;

  const corrections = [
    // Crop names
    [/\bگندوم\b/g, 'گندم'],
    [/\bگندام\b/g, 'گندم'],
    [/\bکپاص\b/g, 'کپاس'],
    [/\bمکئیی\b/g, 'مکئی'],
    [/\bچاولوں\b/g, 'چاول'],
    [/\bکماد\b/g, 'گنا'],
    [/\bسرصوں\b/g, 'سرسوں'],
    [/\bکینولا\b/g, 'کینولا'],
    // Fertilizer & Chemical terms
    [/\bسپراے\b/g, 'سپرے'],
    [/\bاسپرے\b/g, 'سپرے'],
    [/\bاسپرےی\b/g, 'سپرے'],
    [/\bسبرے\b/g, 'سپرے'],
    [/\bسبرائی\b/g, 'سپرے'],
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
    [/\bمن\b/g, 'من'],
    // Disease & Health terms
    [/\bبماری\b/g, 'بیماری'],
    [/\bبیماریاں\b/g, 'بیماری'],
    [/\bسنڈی\b/g, 'سنڈی'],
    [/\bسفید مکھی\b/g, 'سفید مکھی'],
    [/\bسندھی\b/g, 'سنڈی'],
    [/\bکیڑا\b/g, 'کیڑا'],
    [/\bکیڑے\b/g, 'کیڑے'],
    [/\bورائرس\b/g, 'وائرس'],
  ];

  for (const [pattern, replacement] of corrections) {
    t = t.replace(pattern, replacement);
  }

  // Iterative phrase & word deduplication (runs until stable, max 5 passes)
  let prev = '';
  let iterations = 0;
  while (t !== prev && iterations < 5) {
    prev = t;
    iterations++;
    // Strip repeated phrases: "فصل کو پانی کب لگائیں فصل کو پانی کب لگائیں" → single
    t = t.replace(/(\b[\u0600-\u06FF\w\s]{3,35}?\b)\s+\1\b/gu, '$1');
    // Strip repeated single words
    t = t.replace(/\b([\u0600-\u06FF\w]+)(?:\s+\1)+\b/gu, '$1');
    // Strip repeated multi-word phrases
    t = t.replace(/(\b[\u0600-\u06FF\w\s]{2,50}?\b)(?:\s+\1)+\b/gu, '$1');
  }

  return t.trim();
}

/**
 * normalizeUrduForSpeech — Phonetic Text Normalization for TTS
 */
export function normalizeUrduForSpeech(text) {
  if (!text) return '';

  let t = text;
  t = t.replace(/^#{1,6}\s*/gm, '');
  t = t.replace(/\*\*([^*]+)\*\*/g, '$1');
  t = t.replace(/\*([^*]+)\*/g, '$1');
  t = t.replace(/__([^_]+)__/g, '$1');
  t = t.replace(/_([^_]+)_/g, '$1');
  t = t.replace(/```[\s\S]*?```/g, '');
  t = t.replace(/`[^`]+`/g, '');
  t = t.replace(/^[\-\*\•]\s*/gm, '');
  t = t.replace(/^\d+\.\s*/gm, '');
  t = t.replace(/<[^>]+>/g, '');
  t = t.replace(/https?:\/\/\S+/g, '');
  t = t.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FEFF}\u{1F000}-\u{1FFFF}]/gu, '');

  const unitMap = [
    [/\bml\/L\b/gi,    'ملی لیٹر فی لیٹر'],
    [/\bml\/acre\b/gi, 'ملی لیٹر فی ایکڑ'],
    [/\bg\/acre\b/gi,  'گرام فی ایکڑ'],
    [/\bkg\/acre\b/gi, 'کلوگرام فی ایکڑ'],
    [/\blitre[s]?\b/gi, 'لیٹر'],
    [/\bliter[s]?\b/gi, 'لیٹر'],
    [/\bml\b/gi,        'ملی لیٹر'],
    [/\bkg\b/gi,  'کلوگرام'],
    [/\bgm\b/gi,  'گرام'],
    [/\bg\b(?=\s*[\d\u0600-\u06FF])/gi, 'گرام'],
    [/\bacre[s]?\b/gi, 'ایکڑ'],
    [/\bhectare[s]?\b/gi, 'ہیکٹر'],
    [/\bPHI\b/g, 'احتیاطی دن'],
    [/\bWHP\b/g, 'احتیاطی دن'],
    [/\bEC\b/g,  'برقی چالکتا'],
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

  t = t.replace(/(\d+(?:\.\d+)?)/g, (match, num) => {
    if (num.includes('.')) {
      const [intPart, decPart] = num.split('.');
      return `${numberToUrduWords(parseInt(intPart, 10))} اعشاریہ ${numberToUrduWords(parseInt(decPart, 10))}`;
    }
    return numberToUrduWords(parseInt(num, 10));
  });

  t = t.replace(/\n{3,}/g, '\n\n');
  t = t.replace(/[ \t]{2,}/g, ' ');
  return t.trim();
}

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

export function selectUrduVoice(voices, langKey = 'ur') {
  if (!voices || voices.length === 0) return null;
  const msNeural = voices.find(v =>
    v.name.includes('Asad') || v.name.includes('Uzma') ||
    v.name.toLowerCase().includes('urdu (pakistan)') ||
    v.name.toLowerCase().includes('urdu pakistan')
  );
  if (msNeural) return msNeural;
  const googleUrdu = voices.find(v =>
    (v.name.includes('Google') || v.name.includes('google')) &&
    (v.lang === 'ur-PK' || v.lang === 'ur_PK' || v.lang.startsWith('ur'))
  );
  if (googleUrdu) return googleUrdu;
  const anyUrdu = voices.find(v =>
    v.lang === 'ur-PK' || v.lang === 'ur_PK' || v.lang === 'ur-IN' ||
    v.lang.toLowerCase().startsWith('ur') || v.name.toLowerCase().includes('urdu')
  );
  if (anyUrdu) return anyUrdu;
  const hindiNeural = voices.find(v =>
    v.lang === 'hi-IN' || v.lang === 'hi_IN' ||
    v.lang.toLowerCase().startsWith('hi') || v.name.toLowerCase().includes('hindi')
  );
  if (hindiNeural) return hindiNeural;
  const punjabi = voices.find(v => v.lang.toLowerCase().startsWith('pa'));
  if (punjabi) return punjabi;
  return voices[0];
}

export async function requestHardwareMic() {
  if (_micPermissionCache !== null) return _micPermissionCache;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, sampleRate: 44100, channelCount: 1 }
    });
    stream.getTracks().forEach(track => track.stop());
    _micPermissionCache = true;
    return true;
  } catch (err) {
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || err.message?.toLowerCase().includes('permission')) {
      _micPermissionCache = 'denied';
      return 'denied';
    }
    try {
      const s2 = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      s2.getTracks().forEach(t => t.stop());
      _micPermissionCache = true;
      return true;
    } catch (e2) {
      if (e2.name === 'NotAllowedError' || e2.name === 'PermissionDeniedError') {
        _micPermissionCache = 'denied';
        return 'denied';
      }
      return false;
    }
  }
}

/**
 * createSpeechEngine — Production Android-hardened Speech Recognition Engine
 *
 * Android Chrome Strategy:
 *   - continuous = false (true deadlocks Google Speech Services on Android)
 *   - interimResults = true (live character-by-character display)
 *   - onend auto-restarts recognition so farmers can speak multiple sentences
 *   - onStopped fires ONLY after 3.5s silence timer OR explicit user stop
 *   - All stop paths use abort() not stop() for 0ms hardware release
 *   - Event handlers stripped on reset/stop to kill zombie callbacks
 *   - recognitionInstance is a persistent closure reference (GC-safe)
 *
 * Zero-Duplication Guarantee:
 *   - Transcript rebuilt from scratch on every onresult event (never +=)
 *   - isFinal phrases → finalTexts[], non-final → interimTexts[]
 *   - Interim phrases already in finalTexts are dropped
 *   - correctUrduAgriPhonetics() deduplication regex applied to all output
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

  // ── Persistent state (closure-scoped, GC-safe) ────────────────────────────
  // recognitionInstance is a persistent object ref — prevents JS GC from
  // destroying active speech sessions mid-sentence on Infinix/Tecno/Xiaomi/Samsung A-series
  const recognitionInstance = { current: null };

  let transcriptRef = '';   // Single source of truth — rebuilt from e.results each event, NEVER +=
  let stopped       = false;
  let silenceTimer  = null;
  let restartTimer  = null;
  let gotSpeech     = false;
  let emptyEnds     = 0;
  const MAX_EMPTY   = 5;   // Max consecutive no-speech ends before giving up
  let isProcessing  = false;

  // ── Timer utilities ───────────────────────────────────────────────────────
  function clearSilenceTimer() {
    if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; }
  }

  function clearRestartTimer() {
    if (restartTimer) { clearTimeout(restartTimer); restartTimer = null; }
  }

  // ── Silence auto-stop timer ───────────────────────────────────────────────
  // Fires after silenceMs (3.5s) of no new audio input.
  // Uses abort() not stop() to prevent Android Chrome buffer-flush hang.
  function resetSilenceTimer(recognition) {
    clearSilenceTimer();
    silenceTimer = setTimeout(() => {
      if (!stopped && !isProcessing) {
        stopped = true;
        isProcessing = true;
        // Strip handlers before abort to prevent zombie callbacks
        recognition.onresult = null;
        recognition.onerror  = null;
        recognition.onend    = null;
        try { recognition.abort(); } catch {}
        const clean = correctUrduAgriPhonetics(transcriptRef.trim());
        onStopped?.(clean);
        if (clean && onResult) onResult(clean);
        setTimeout(() => { isProcessing = false; }, 300);
      }
    }, silenceMs);
  }

  // ── Strip all event handlers from a recognition instance ─────────────────
  function stripHandlers(rec) {
    if (!rec) return;
    rec.onresult = null;
    rec.onerror  = null;
    rec.onend    = null;
    rec.onstart  = null;
    rec.onspeechend = null;
  }

  // ── Create a new SpeechRecognition instance ───────────────────────────────
  function createRecognition(fallbackLang = null) {
    const recognition = new SR();
    recognition.lang           = fallbackLang || srLang;
    recognition.maxAlternatives = 3; // Check top 3 speech alternatives for maximum Urdu accuracy

    if (singlePass) {
      // Single-pass: capture one clean sentence, no live interim
      recognition.continuous     = false;
      recognition.interimResults = false;
    } else {
      // ANDROID/iOS: continuous=false prevents Google Speech Services deadlock
      // Desktop Chrome/Edge/Firefox: continuous=true for uninterrupted recording
      recognition.continuous     = !isIOS && !isAndroid;
      recognition.interimResults = true;  // Live character-by-character display
    }

    recognition.onstart = () => {
      // Audio hardware started — clear any stale error state
    };

    recognition.onresult = (e) => {
      if (isProcessing || stopped) return;
      emptyEnds = 0; // Reset empty counter whenever audio speech arrives

      if (!e.results || e.results.length === 0) return;

      // ── Single-Pass Mode ──────────────────────────────────────────────────
      if (singlePass) {
        isProcessing = true;
        const rawText    = e.results[0][0].transcript.trim();
        const spokenText = correctUrduAgriPhonetics(rawText);
        if (spokenText) {
          transcriptRef = spokenText;
          onFinalWord?.(spokenText);
          if (onResult) onResult(spokenText);
        }
        stopped = true;
        clearSilenceTimer();
        stripHandlers(recognition);
        try { recognition.abort(); } catch {}
        onStopped?.(spokenText || '');
        setTimeout(() => { isProcessing = false; }, 300);
        return;
      }

      // ── Rural / Continuous Mode ───────────────────────────────────────────
      // Rebuild transcript from scratch on EVERY onresult event.
      // NEVER use += across events — that causes text doubling.
      const finalTexts   = [];
      const interimTexts = [];

      for (let i = 0; i < e.results.length; i++) {
        const item   = e.results[i];
        // Select highest quality alternative transcript
        const phrase = item[0]?.transcript?.trim() || item[1]?.transcript?.trim() || item[2]?.transcript?.trim() || '';
        if (!phrase) continue;

        if (item.isFinal) {
          // Deduplicate: only add if not already contained in finalTexts
          const isDup = finalTexts.some(
            existing => existing.includes(phrase) || phrase.includes(existing)
          );
          if (!isDup) finalTexts.push(phrase);
        } else {
          // Drop interim if it's already captured in a final result
          const alreadyFinal = finalTexts.some(
            f => f.includes(phrase) || phrase.includes(f)
          );
          if (!alreadyFinal) interimTexts.push(phrase);
        }
      }

      const combinedFinal   = finalTexts.join(' ').trim();
      let   combinedInterim = interimTexts.join(' ').trim();

      // Drop interim if it fully overlaps with final text
      if (combinedInterim && combinedFinal &&
          (combinedFinal.includes(combinedInterim) || combinedInterim.includes(combinedFinal))) {
        combinedInterim = '';
      }

      const cleanFinal   = correctUrduAgriPhonetics(combinedFinal);
      const cleanInterim = correctUrduAgriPhonetics(combinedInterim);

      // Update canonical transcript (REPLACE, never append)
      if (cleanFinal) {
        transcriptRef = cleanFinal;
        onFinalWord?.(transcriptRef);
        if (onResult) onResult(transcriptRef);
      }

      // Stream live interim text to UI
      if (onInterim) onInterim(cleanInterim);

      // Reset 3.5s silence countdown on every speech packet
      resetSilenceTimer(recognition);
    };

    recognition.onerror = (e) => {
      clearSilenceTimer();
      if (stopped) return;

      console.warn('[DehatiAI] Speech error:', e.error, '| lang:', recognition.lang);

      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        stopped = true;
        onError?.('permission_denied');
        return;
      }

      if (e.error === 'language-not-supported') {
        // Pakistani Language Fallback Chain: ur-PK → ur-IN → hi-IN → en-US
        const fallbackChain = ['ur-IN', 'hi-IN', 'en-US'];
        const currentIdx    = fallbackChain.indexOf(recognition.lang);
        const nextLang      = currentIdx === -1 ? fallbackChain[0] : fallbackChain[currentIdx + 1];
        if (nextLang && !stopped) {
          console.warn(`[DehatiAI] Language fallback: ${recognition.lang} → ${nextLang}`);
          try {
            const fallbackRec = createRecognition(nextLang);
            recognitionInstance.current = fallbackRec;
            fallbackRec.start();
            return;
          } catch {}
        }
        stopped = true;
        onError?.('language-not-supported');
        return;
      }

      // 'no-speech', 'aborted' — handled gracefully in onend
      // 'network' — auto-restart will be tried in onend
    };

    recognition.onend = () => {
      clearSilenceTimer();
      if (stopped) return;

      // Only increment empty counter if user has not spoken any text at all
      if (!transcriptRef) emptyEnds++;

      if (emptyEnds >= MAX_EMPTY) {
        stopped = true;
        onError?.('no_speech');
        return;
      }

      if (singlePass) return;

      // Ultra-fast 30ms auto-restart prevents missing audio or interrupting speaker mid-sentence
      clearRestartTimer();
      restartTimer = setTimeout(() => {
        if (stopped) return;
        try {
          const next = createRecognition();
          stripHandlers(recognitionInstance.current);
          recognitionInstance.current = next;
          next.start();
        } catch (err) {
          console.warn('[DehatiAI] Restart failed:', err.message);
        }
      }, 30);
    };

    return recognition;
  }

  // ── Public API ────────────────────────────────────────────────────────────
  return {
    start() {
      // Reset all state for a fresh session
      transcriptRef = '';
      stopped       = false;
      gotSpeech     = false;
      emptyEnds     = 0;
      isProcessing  = false;

      clearSilenceTimer();
      clearRestartTimer();

      // Cleanly destroy previous instance (strip handlers first, then abort)
      if (recognitionInstance.current) {
        stripHandlers(recognitionInstance.current);
        try { recognitionInstance.current.abort(); } catch {}
        recognitionInstance.current = null;
      }

      const rec = createRecognition();
      recognitionInstance.current = rec;

      try {
        rec.start();
      } catch (err) {
        if (err.name === 'InvalidStateError') {
          // Browser still has stale session — retry after 300ms
          clearRestartTimer();
          restartTimer = setTimeout(() => {
            if (!stopped) {
              try { rec.start(); } catch { onError?.('unknown'); }
            }
          }, 300);
        } else {
          console.error('[DehatiAI] Start failed:', err.message);
          onError?.('unknown');
        }
      }
    },

    stop() {
      // Gentle user stop: flush final speech buffer, trigger stop audio cue
      stopped      = true;
      isProcessing = true;
      clearSilenceTimer();
      clearRestartTimer();
      if (recognitionInstance.current) {
        const rec = recognitionInstance.current;
        try { rec.stop(); } catch { try { rec.abort(); } catch {} }
        setTimeout(() => {
          stripHandlers(rec);
          if (recognitionInstance.current === rec) recognitionInstance.current = null;
        }, 150);
      }
      const clean = correctUrduAgriPhonetics(transcriptRef.trim());
      setTimeout(() => {
        onStopped?.(clean);
        isProcessing = false;
      }, 100);
      return clean;
    },

    reset() {
      // Cancel without triggering onStopped — for overlay close / cancel button
      stopped      = true;
      isProcessing = false;
      clearSilenceTimer();
      clearRestartTimer();
      if (recognitionInstance.current) {
        stripHandlers(recognitionInstance.current);
        try { recognitionInstance.current.abort(); } catch {}
        recognitionInstance.current = null;
      }
      transcriptRef = '';
    },

    getAccumulated() {
      return correctUrduAgriPhonetics(transcriptRef.trim());
    },

    get isIOS() { return isIOS; },
  };
}

/**
 * speakText — Natural Urdu TTS with Android-aware Pakistani voice selection.
 */
export async function speakText(text, langKey = 'ur', rate = 0.85) {
  if (!window.speechSynthesis || !text) return false;

  window.speechSynthesis.cancel();

  const normalized = normalizeUrduForSpeech(text);
  if (!normalized) return false;

  const utt    = new SpeechSynthesisUtterance(normalized);
  utt.lang     = getSRLang(langKey);
  utt.rate     = rate;
  utt.pitch    = 1.0;
  utt.volume   = 1.0;

  const voices = window.speechSynthesis.getVoices();
  if (voices && voices.length > 0) {
    const voice = selectUrduVoice(voices, langKey);
    if (voice) utt.voice = voice;
  }

  window.speechSynthesis.speak(utt);
  return true;
}

/**
 * playAudioCue — Synthetic, zero-asset Web Audio API audio feedback for voice start/stop.
 * @param {'start' | 'stop' | 'error'} type
 */
let _sharedAudioCtx = null;
function getAudioContext() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!_sharedAudioCtx || _sharedAudioCtx.state === 'closed') {
      _sharedAudioCtx = new AudioCtx();
    }
    if (_sharedAudioCtx.state === 'suspended') {
      _sharedAudioCtx.resume().catch(() => {});
    }
    return _sharedAudioCtx;
  } catch {
    return null;
  }
}

export function playAudioCue(type = 'start') {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const now = ctx.currentTime;

    if (type === 'start') {
      // Pleasant double-chime ascending (C5 523Hz -> G5 784Hz)
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.08);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.16);
    } else if (type === 'stop') {
      // Soft descending chime (G5 784Hz -> C5 523Hz)
      osc.frequency.setValueAtTime(783.99, now);
      osc.frequency.exponentialRampToValueAtTime(523.25, now + 0.08);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.16);
    } else if (type === 'error') {
      // Low subtle error buzz (E4 329Hz)
      osc.frequency.setValueAtTime(329.63, now);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    }
  } catch (e) {
    // Non-fatal if audio context is restricted
  }
}

