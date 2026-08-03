/**
 * Prompsy — DehatiAI Master Prompt Enhancer CLI & Engine
 * Usage: node scripts/prompsy.js "your keywords here"
 */

const fs = require('fs');
const path = require('path');

const inputKeywords = process.argv.slice(2).join(' ').trim();

if (!inputKeywords) {
  console.log(`
🌟 PROMPSY — DEHATIAI MASTER PROMPT ENHANCER
============================================
Usage:
  node scripts/prompsy.js "<keywords>"

Examples:
  node scripts/prompsy.js "fertilizer calculator"
  node scripts/prompsy.js "offline chat"
  node scripts/prompsy.js "kissan card scheme"
  node scripts/prompsy.js "disease scanner"
`);
  process.exit(0);
}

function enhancePrompt(keywords) {
  const kw = keywords.toLowerCase();

  let domainContext = 'DehatiAI Full-Stack Architecture';
  let focusArea = 'AgriTech PWA Optimization';

  if (kw.includes('chat') || kw.includes('voice') || kw.includes('ai')) {
    domainContext = 'Trilingual AI Voice Chat & Streaming Engine (Claude 3.5 Sonnet + Web Speech ASR/TTS)';
  } else if (kw.includes('offline') || kw.includes('pwa') || kw.includes('cache')) {
    domainContext = '0ms 4-Pillar Offline PWA Architecture (IndexedDB 110 FAQs + DRAP Remedies)';
  } else if (kw.includes('disease') || kw.includes('leaf') || kw.includes('scan')) {
    domainContext = 'Plant Leaf Disease Pathologist & ResNet50 PyTorch Vision Classifier';
  } else if (kw.includes('calc') || kw.includes('spray') || kw.includes('fertilizer') || kw.includes('solar')) {
    domainContext = '5 Smart Agricultural Calculators Suite (NPK, Weather Spray, ROI, Seed, Solar)';
  } else if (kw.includes('scheme') || kw.includes('tractor') || kw.includes('kissan card')) {
    domainContext = 'Auto-Updating Punjab Govt Schemes & CM Kissan Card Eligibility Engine';
  }

  return `
================================================================================
🌟 PROMPSY ENHANCED MASTER PROMPT
================================================================================
# SYSTEM ROLE & CONTEXT
You are the Lead Systems Architect building "DehatiAI" (دیہاتی AI).
Target Focus: ${domainContext}
Input Enhancer: "${keywords}"

# OBJECTIVE & REQUIREMENTS
- Implement, audit, or optimize the target functionality for Pakistani farmers in Punjab.
- Ensure 100% compliance with mobile Android Chrome viewports, Noto Nastaliq Urdu typography (dir="rtl"), and WCAG 2.1 AA contrast standards (>4.5:1).
- Maintain 0ms offline fallback resilience using IndexedDB, localStorage, and Service Worker pre-caching.
- Include mandatory safety disclaimers: "⚠️ یہ AI تجویز ہے۔ حتمی فیصلے سے قبل مقامی زرعی ماہر یا ویٹرنری ڈاکٹر سے مشورہ کریں۔"

# EXECUTION STANDARDS
- 0 Bugs, 0 Runtime Crashes, 0 ESLint Warnings, 0 Console Errors.
- Run 'vite build' (0 errors) and test empirical outputs before declaring task complete.
================================================================================
`;
}

console.log(enhancePrompt(inputKeywords));
