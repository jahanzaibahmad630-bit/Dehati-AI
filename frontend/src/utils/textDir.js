/**
 * textDir.js — Bidirectional text utilities for DehatiAI
 *
 * Urdu (Arabic script) → RTL   (right-to-left)
 * English / Roman Urdu  → LTR  (left-to-right)
 *
 * Unicode ranges covered:
 *   U+0600–U+06FF  Arabic / Urdu
 *   U+0750–U+077F  Arabic Supplement
 *   U+FB50–U+FDFF  Arabic Presentation Forms-A
 *   U+FE70–U+FEFF  Arabic Presentation Forms-B
 */

const URDU_ARABIC_RE = /[\u0600-\u06ff\u0750-\u077f\ufb50-\ufdff\ufe70-\ufeff]/;

/**
 * Returns 'rtl' or 'ltr' based on the first non-whitespace character.
 * Defaults to 'rtl' for empty strings (Urdu-primary app).
 */
export function getDir(text) {
  if (!text || !text.trim()) return 'rtl';
  const urduMatches = text.match(/[\u0600-\u06ff\u0750-\u077f\ufb50-\ufdff\ufe70-\ufeff]/g);
  if (urduMatches && urduMatches.length >= 2) return 'rtl';
  const first = text.trim()[0];
  return URDU_ARABIC_RE.test(first) ? 'rtl' : 'ltr';
}

/**
 * Returns the correct font-family for the given text.
 * Urdu script → Nastaliq serif
 * Latin script → Inter / system UI
 */
export function getFont(text) {
  if (getDir(text) === 'rtl') {
    return '"Noto Nastaliq Urdu", "Jameel Noori Nastaleeq", "Nafees Web Naskh", serif';
  }
  return '"Inter", "Segoe UI", system-ui, -apple-system, sans-serif';
}

/**
 * Returns text-align matching the direction.
 */
export function getAlign(text) {
  return getDir(text) === 'rtl' ? 'right' : 'left';
}

/**
 * Returns true if text contains any Urdu/Arabic characters anywhere.
 * Used to decide whether to render Urdu font even in mixed-script text.
 */
export function hasUrdu(text) {
  if (!text) return false;
  return URDU_ARABIC_RE.test(text);
}
