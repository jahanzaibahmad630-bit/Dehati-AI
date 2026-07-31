# Dehati AI — Chat Box Audit Report (Phase 0)

**Date:** July 31, 2026  
**Auditor:** Senior React & Web Audio AI Engineer  

---

## Baseline Reproduction Log (B1 – B10)

### Bug B1: UI Language Parameter Dropped in Backend & UI Un-localized
- **Repro Command:**  
  `curl -s -X POST http://localhost:3001/api/ai/ask -H 'content-type: application/json' -d '{"question":"When should I plant wheat?","language":"en"}'`
- **Actual Result:** Returns Urdu response (`## گندم کی بوائی کا صحیح وقت...`).
- **Root Cause:** Backend `/api/ai/ask` handler ignored `req.body.language` and always called `buildFarmingSystem()` (hardcoded Urdu). Additionally, frontend UI chrome (quick replies, placeholders, empty state, text direction) remained hardcoded Urdu when switching to English.

### Bug B2: Punjabi Language Support Faked
- **Repro Command:**  
  `curl -s -X POST http://localhost:3001/api/ai/ask -H 'content-type: application/json' -d '{"question":"salam","language":"pa"}'`
- **Actual Result:** Returns standard Urdu reply.
- **Root Cause:** Backend `buildChatSystem(language)` only checked `language === 'pj'` (ignoring `'pa'`) and merely appended an Urdu sentence (`پنجابی یا سرائیکی میں جواب دینا قبول ہے`) to an Urdu prompt.

### Bug B3: Streaming Route Error (`/api/ai/chat/stream`)
- **Repro Command:**  
  `curl -s -N -X POST http://localhost:3001/api/ai/chat/stream -H 'content-type: application/json' -d '{"messages":[{"role":"user","content":"hello"}]}'`
- **Actual Result:**  
  `Chat stream error: Cannot set headers after they are sent to the client`  
  `data: {"error":"جواب دینے میں مسئلہ ہوا"}`
- **Root Cause:** Line 635 called `res.flushHeaders()`, followed by line 668/681 calling `res.setHeader('X-Cache', 'HIT'/'MISS')`. Calling `res.setHeader()` after headers are flushed throws an HTTP header exception which gets caught and returns the generic error event.

### Bug B4: Markdown Half-Rendered
- **Repro Command:**  
  `curl -s -X POST http://localhost:3001/api/ai/ask -H 'content-type: application/json' -d '{"question":"gandum mein urea kab"}'`
- **Actual Result:** Raw Markdown (`##`, `**`, `-`) and helpline numbers (`0800-15000`) are partially broken or un-clickable in UI bubbles.

### Bug B5: Tofu Glyphs on Stop Control
- **Observation:** Stop generating button renders fallback/unsupported characters `▢▢▢▢ ⏹` due to font mismatch.

### Bug B6: Reversed Timestamps Under RTL
- **Observation:** Timestamps display as `PM 02:11` instead of `02:11 PM` under RTL flex containers.

### Bug B7: Clear Button Wipes Without Confirmation
- **Observation:** Tapping trash icon instantly clears all messages without asking user confirmation.

### Bug B8: Voice Input Fails Silently
- **Observation:** Speech recognition failure or missing mic permissions results in no user feedback or toast error message.

### Bug B9: Clipped Toolbar & Quick-Reply Chips
- **Observation:** Language selectors and quick-reply chips overflow 360px/390px mobile screens horizontally causing layout clipping.

### Bug B10: Open Rate Limits & Unpersisted History
- **Observation:** `/api/ai/chat/stream` and `/api/ai/ask` lack per-IP/user strict burst rate limits, and chat history is lost on refresh for logged-in users.

---

## Remediation Strategy
- **Phase 1:** Wire language parameter through client & backend, localize UI chrome, implement real Shahmukhi Punjabi system prompt for `pa`/`pj`.
- **Phase 2:** Fix header execution order in `/api/ai/chat/stream`, implement SSE client streaming with AbortController Stop button.
- **Phase 3:** Update Markdown rendering & linkification (`tel:`, URLs), replace glyphs with clean UI components, wrap timestamps in `<bdi>`.
- **Phase 4:** Add clear chat confirmation dialog, explicit speech engine error toasts, mobile horizontal scroll containers, CJK/IME Enter-key protection.
- **Phase 5:** Implement rate limiting (429 + Retry-After), payload size caps, and server-side chat history persistence.
