# DehatiAI — 3-Minute Competition Demo Script

**Target Audience:** Competition judges evaluating honest AI, agricultural impact, and production quality.

---

## Setup (Before Demo)

1. Open `https://dehati-ai.vercel.app` on an Android phone (Chrome).
2. Ensure internet connectivity for live weather and AI Vision.
3. Have a real leaf photo ready (diseased plant leaf) and a non-plant photo (e.g. car).

---

## Minute 1: Honest AI Disease Scanner (0:00 – 1:00)

### Demo 1A: Upload a Real Leaf Photo
1. Navigate to **🔬 لیف اسکینر** (Disease Scanner tab).
2. Take or upload a photo of a diseased plant leaf.
3. **Show:** The system honestly labels the data source:
   - If a database match exists → Badge: `"✓ مقامی ڈیٹابیس ریکارڈ"` with local Pakistani spray brands, dosages, and PHI safety days.
   - If no match → Badge: `"🤖 AI وژن تجزیہ"` — Claude Vision analyzes the image in real-time.
4. **Highlight:** The mandatory disclaimer at the bottom: _"استعمال سے پہلے مقامی زرعی افسر سے تصدیق کروائیں۔"_

### Demo 1B: Upload a Non-Plant Photo (Car/Shoe)
1. Upload a car or shoe photo.
2. **Show:** The system does NOT diagnose it as a disease — Claude Vision rejects non-plant images.
3. **Say:** _"Unlike systems that hallucinate a disease for any image, DehatiAI honestly rejects non-plant inputs."_

---

## Minute 2: Criteria-Based Eligibility & Live Weather (1:00 – 2:00)

### Demo 2A: Kisan Card Criteria Checker
1. Navigate to **📋 اسکیمیں** (Schemes tab).
2. Fill in the Kisan Card criteria:
   - Land: "5 سے 12.5 ایکڑ"
   - Status: "مالک"
   - Bank default: "نہیں"
3. **Show:** Result: `"✅ شرائط کے مطابق آپ اہل ہیں"` with the exact rule cited.
4. **Then** change land to "12.5 ایکڑ سے زیادہ" → Result: `"❌ غیر اہل — وجہ: 12.5 ایکڑ سے زیادہ زمین"`
5. **Highlight:** The disclaimer badge: _"حتمی منظوری صرف بینک آف پنجاب اور محکمہ زراعت کرے گا"_
6. **Say:** _"We evaluate published government criteria — we do NOT pretend to verify against NADRA or bank databases."_

### Demo 2B: Live Weather
1. Navigate to **🌤️ موسم** (Weather tab).
2. **Show:** 7-day forecast from Open-Meteo API with live temperatures, farm action recommendations.
3. **Highlight:** `"🟢 لائیو"` provenance badge — real-time API data.

---

## Minute 3: Voice AI Chat + Offline Resilience (2:00 – 3:00)

### Demo 3A: Urdu Voice Chat
1. Navigate to **💬 چیٹ** (Chat tab).
2. Tap the **🎤 mic button** and say: _"گندم میں زنگ کا علاج بتائیں"_
3. **Show:** Live Urdu transcription appearing in the mic overlay popup (single clean sentence, no duplication).
4. **Show:** Streaming AI response arriving token-by-token via SSE.
5. **Highlight:** The **🔊 سنیں** audio button on the response — tap to hear Pakistani Urdu TTS.

### Demo 3B: Offline Graceful Degradation
1. Turn off airplane mode / disconnect WiFi.
2. Navigate to any page.
3. **Show:** Offline banner appears. Weather shows cached data. Disease scanner falls back to local database.
4. **Say:** _"For rural farmers with intermittent connectivity, DehatiAI caches everything locally and degrades gracefully — no crashes, no blank screens."_

---

## Closing Statement (3:00)

> _"DehatiAI is built on a zero-fabrication principle. Every data source is labeled. Every AI result carries a disclaimer. Every limitation is documented. We believe Pakistan's farmers deserve honest technology — not hallucinated confidence scores."_

---

## Key Differentiators for Judges

| Feature | DehatiAI | Typical Agri Apps |
|---------|----------|-------------------|
| Confidence Scores | Real AI analysis or database match | Fake hash-generated percentages |
| Government Claims | Criteria-based estimate with disclaimer | Fake "verified" badges |
| Non-Plant Rejection | AI rejects non-plant images | Returns random disease |
| Data Provenance | Every card has source badge | No attribution |
| Offline Mode | Graceful degradation with cached data | Crashes or blank screen |
| Voice | Urdu STT + TTS with deduplication | None or English only |
