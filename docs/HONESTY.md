# DehatiAI — Honesty & Data Provenance Documentation

**Last Updated:** July 2026

---

## Overriding Principle

> **Never display a result the system did not actually compute. Never attribute a result to a model, dataset, or authority that was not actually consulted.**

---

## Feature Inventory

| Feature | Data Source | Model/Engine | Provenance Type | Known Limitations |
|---------|-----------|-------------|-----------------|-------------------|
| **Leaf Disease Scanner** | `agronomyDatabase.json` (local) + Claude Vision API (cloud) | Claude 3.5 Sonnet Vision (Tier-2) | `database_match` or `ai_vision` | Local DB has ~50 verified prescriptions. Claude requires internet. No local PyTorch inference in Node.js. |
| **Chat AI** | Claude 3.5 Sonnet via Anthropic API | Claude 3.5 Sonnet | `live` (API) | Requires internet. Agricultural keyword guard filters non-farming queries. |
| **Weather Forecast** | Open-Meteo API (free, no key) | N/A — raw API data | `live` (API) | 7-day forecast only. No historical data. GPS accuracy depends on device. |
| **Mandi Prices** | Admin-entered via dashboard + static fallback | N/A | `live` (admin) or `sample` (static) | Prices may lag real market by 24-48 hours. Static fallback is approximate. |
| **Kisan Card Checker** | Published CM Punjab 2026 eligibility rules | Rule engine (client-side) | `criteria` | Evaluates against published rules only. Final approval is by Bank of Punjab. NOT a verification against government databases. |
| **Pest Seasonal Trends** | Hardcoded seasonal patterns based on UAF agronomy calendar | Seasonal heuristic | `criteria` (seasonal estimate) | NOT from live government pest scouting data. General trends only. |
| **Spray Dose Calculator** | Published product labels and per-acre dosages | Arithmetic calculation | `criteria` | Based on standard recommendations. Actual dosage may vary by severity. |
| **Urdu TTS (Voice)** | Browser Web Speech API | Microsoft Asad/Uzma (Android Chrome) | `live` (device) | Quality varies by device. Not available on iOS Safari PWA. |
| **Speech-to-Text** | Browser Web Speech API | Google Cloud Speech (via Chrome) | `live` (device) | Requires internet on Chrome. Urdu accuracy ~85%. |

---

## What We Do NOT Do

1. **No PyTorch Inference in Production.** The `ResNet50-Plant-model-80.pth` file exists in the repository but Node.js cannot natively execute PyTorch models. We do NOT claim to run local neural network inference.

2. **No Government Database Verification.** We do NOT connect to Bank of Punjab, PLRA, NADRA, or any government database. Eligibility results are based on published criteria only.

3. **No Real-Time Pest Scouting.** We do NOT consume official Punjab Pest Warning RSS/JSON feeds. Seasonal pest trends are estimates based on historical patterns.

4. **No Guaranteed Accuracy.** All AI-generated diagnoses carry a mandatory disclaimer: "استعمال سے پہلے مقامی زرعی افسر سے تصدیق کروائیں۔"

---

## Provenance Badge System

Every data-driven UI card displays a `<DataProvenance>` badge indicating:

| Badge | Meaning | Example |
|-------|---------|---------|
| 🟢 لائیو | Real-time data from live API | Weather forecast, Chat AI |
| 🟡 نمونہ | Sample/approximate data | Static mandi prices |
| 📋 اصول | Evaluated against published rules | Kisan Card eligibility |
| 🔴 آف لائن | Offline fallback — reduced accuracy | Cached disease results |

---

## Mandatory Disclaimers

1. **Disease Diagnosis:** "استعمال سے پہلے مقامی زرعی افسر سے تصدیق کروائیں۔"
2. **Kisan Card:** "حتمی منظوری صرف بینک آف پنجاب اور محکمہ زراعت کرے گا — یہ صرف شرائط کی بنیاد پر تخمینہ ہے۔"
3. **Pest Trends:** "یہ عمومی موسمی رجحان ہے — سرکاری تصدیق نہیں۔"
