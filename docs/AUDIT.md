# DehatiAI — Integrity Audit Report

**Date:** July 2026
**Auditor:** AI Architect (Zero Fabrication Overhaul)

---

## Test Case 1: Leaf Scanner — Same Image, Different Crop Selection

**Steps:** Upload identical leaf image twice, selecting "گندم" (Wheat) first, then "کپاس" (Cotton).

| Run | Crop Selected | Disease Returned | Confidence | Expected |
|-----|--------------|-----------------|------------|----------|
| 1   | گندم (Wheat) | Wheat Brown Rust | 87.3% | — |
| 2   | کپاس (Cotton) | Cotton Whitefly | 89.1% | — |

**Verdict: ❌ FABRICATED.** The system hashes the crop name to bias the disease class. The same image bytes should produce the same result regardless of dropdown selection when real model inference is used.

**Fix Applied:** `predictDisease()` now returns `source: 'requires_ai_analysis'` for ALL image uploads, delegating to Claude Vision for real analysis. Crop name is passed as context to Claude, not used to override inference.

---

## Test Case 2: Leaf Scanner — Non-Plant Image (Car/Shoe)

**Steps:** Upload a photo of a car or shoe.

| Input | Result Before Fix | Expected |
|-------|------------------|----------|
| Car photo | "Wheat Yellow Stripe Rust (72.4%)" | Error: not a plant image |

**Verdict: ❌ FABRICATED.** The hash function maps ANY bytes to one of 306 disease classes. It cannot distinguish a leaf from a car.

**Fix Applied:** Image classification now delegates to Claude Vision, which can reject non-plant images. Local database matches (no image) correctly serve catalog entries.

---

## Test Case 3: Rate Limiting on AI Endpoints

**Route:** `POST /api/ai/ask` and `POST /api/ai/disease`

| Config | Value |
|--------|-------|
| Rate Limiter | `aiLimiter` — 30 requests/hour/IP |
| Disease Limiter | `diseaseLimiter` — 15 scans/hour/IP (NEW) |
| Headers | `RateLimit-*` standard headers (RFC 6585) |
| 429 Response | Urdu error message + `Retry-After` header |

**Verdict: ✅ FUNCTIONAL.** Rate limiting was already applied via `aiLimiter`. Enhanced with stricter `diseaseLimiter` for image analysis and proper `Retry-After` headers.

---

## Test Case 4: CNIC Eligibility — Last Digit Branching

**Steps:** Enter two CNICs identical except for the 13th digit:
- `36302-1234567-0` (last digit 0)
- `36302-1234567-9` (last digit 9)

| CNIC | Result Before Fix | Expected |
|------|------------------|----------|
| ...7-0 | ✅ Eligible | Cannot determine without real DB |
| ...7-9 | ❌ Ineligible | Cannot determine without real DB |

**Verdict: ❌ FABRICATED.** Eligibility was determined by `[0,1,2,3,4,5,6,7].includes(lastDigit)` — a completely arbitrary rule. Fake "BOP تصدیق" and "PLRA لینڈ ریکارڈ" badges falsely implied government database verification.

**Fix Applied:** Replaced with criteria-based checklist evaluating published CM Punjab Kisan Card 2026 rules (land < 12.5 acres, no bank default). No CNIC processing. Mandatory disclaimer: "حتمی منظوری صرف بینک آف پنجاب اور محکمہ زراعت کرے گا۔"

---

## Summary of Fabrication Issues Found

| # | Feature | Fabrication Type | Severity |
|---|---------|-----------------|----------|
| 1 | Disease Confidence Score | Hash-generated fake percentage (60–92.5%) | 🔴 Critical |
| 2 | ResNet50 Attribution | False claim of model inference | 🔴 Critical |
| 3 | CNIC Eligibility | Arbitrary last-digit branching | 🔴 Critical |
| 4 | BOP/PLRA Badges | False government verification claims | 🔴 Critical |
| 5 | Pest Radar Percentage | Hardcoded "24% زیادہ خطرہ" | 🟡 Medium |
| 6 | Pest Directorate Source | False Punjab Pest Warning attribution | 🟡 Medium |
| 7 | Non-Plant Image Handling | Random disease for car/shoe photos | 🔴 Critical |
