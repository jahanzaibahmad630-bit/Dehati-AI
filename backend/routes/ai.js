const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { authenticateToken } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimit');

const router = express.Router();

let genAI = null;
let flashModel = null;   // gemini-2.0-flash — fast, free-tier, vision-capable
let flashThinkModel = null;

if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  flashModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  console.log('✅ Gemini API configured — model: gemini-2.0-flash');
} else {
  console.warn('⚠️  GEMINI_API_KEY not set — AI features disabled');
}

// ─── System prompt (Urdu farming assistant) ──────────────────────────────────
const FARMING_SYSTEM = `آپ DehatiAI ہیں — پنجاب، پاکستان کے کسانوں کا ذہین مددگار۔
آپ کا کردار: فصلوں، کھادوں، بیماریوں، آبپاشی، منڈی کی قیمتوں، اور سرکاری اسکیموں کے بارے میں عملی مشورے دینا۔

اہم ہدایات:
- جواب آسان، عام فہم اردو میں دیں جو ایک گاؤں کا کسان بھی سمجھ سکے
- تکنیکی الفاظ سے پرہیز کریں، عام بول چال کا انداز اپنائیں
- جواب مختصر اور عملی ہو (200 الفاظ سے کم)
- پاکستان میں دستیاب دوائیاں اور کھادیں تجویز کریں
- اگر کوئی بات یقینی نہ ہو تو صاف کہیں: "مقامی زرعی افسر سے مشورہ کریں"
- کبھی غلط یا من گھڑت معلومات نہ دیں`;

const CHAT_SYSTEM = `آپ DehatiAI ہیں — پنجاب کے کسانوں کا دوستانہ AI ساتھی۔
بالکل WhatsApp پر کسی قریبی دوست سے بات کرنے جیسا انداز اپنائیں — آرام سے، خلوص سے۔
مختصر جوابات دیں۔ لمبے لیکچر سے بچیں۔
کسان کی زبان میں جواب دیں — اگر وہ پنجابی میں لکھے تو پنجابی میں، اردو میں تو اردو میں۔
سنجیدہ بیماری یا مالی نقصان کی بات آئے تو فوری ماہر سے ملنے کا مشورہ دیں۔`;

function aiUnavailable() {
  return {
    answer: '⚠️ AI سروس ابھی دستیاب نہیں ہے۔ ایڈمن سے GEMINI_API_KEY ترتیب دلوائیں۔',
    disabled: true
  };
}

// Helper: generate with system instruction prepended
async function generate(prompt, systemPrompt = FARMING_SYSTEM, maxTokens = 700) {
  const fullPrompt = `${systemPrompt}\n\n---\n\n${prompt}`;
  const result = await flashModel.generateContent({
    contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
    generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 }
  });
  return result.response.text();
}

// ─── POST /api/ai/ask ─────────────────────────────────────────────────────────
router.post('/ask', aiLimiter, authenticateToken, async (req, res) => {
  try {
    const { question } = req.body;
    if (!question?.trim()) {
      return res.status(400).json({ error: 'سوال خالی نہیں ہونا چاہیے' });
    }
    if (!flashModel) return res.json(aiUnavailable());

    const text = await generate(question.trim());
    res.json({ answer: text });
  } catch (err) {
    console.error('AI ask error:', err.message);
    res.status(500).json({ error: 'AI جواب دینے میں ناکام رہا — دوبارہ کوشش کریں' });
  }
});

// ─── POST /api/ai/disease ─────────────────────────────────────────────────────
router.post('/disease', aiLimiter, authenticateToken, async (req, res) => {
  try {
    const { imageBase64, cropName, mimeType = 'image/jpeg' } = req.body;
    if (!imageBase64) return res.status(400).json({ error: 'تصویر ضروری ہے' });

    if (!flashModel) {
      return res.json({
        disease: 'AI دستیاب نہیں',
        cause: 'API کی چابی ترتیب نہیں دی گئی',
        treatment: 'ایڈمن سے رابطہ کریں',
        prevention: 'GEMINI_API_KEY ترتیب دیں',
        disabled: true
      });
    }

    const cropText = cropName ? `فصل: ${cropName}\n` : '';
    const prompt = `${FARMING_SYSTEM}\n\n${cropText}
اس تصویر میں فصل کی حالت دیکھ کر بتائیں:

جواب صرف اس مخصوص فارمیٹ میں دیں:
بیماری: [بیماری یا کیڑے کا نام، یا "صحت مند فصل"]
وجہ: [بیماری کی بنیادی وجہ]
علاج: [پاکستان میں دستیاب دوائی اور طریقہ]
بچاؤ: [آئندہ کے لیے احتیاطی تدابیر]

آسان اردو میں، ہر حصہ ایک یا دو جملوں میں لکھیں۔`;

    const result = await flashModel.generateContent({
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { mimeType, data: imageBase64 } },
          { text: prompt }
        ]
      }],
      generationConfig: { maxOutputTokens: 900, temperature: 0.4 }
    });

    const text = result.response.text();
    const extract = (field) => {
      const match = text.match(new RegExp(`${field}:\\s*(.+?)(?=\\n\\S|$)`, 's'));
      return match ? match[1].trim() : '';
    };

    res.json({
      disease: extract('بیماری'),
      cause: extract('وجہ'),
      treatment: extract('علاج'),
      prevention: extract('بچاؤ'),
      rawText: text
    });
  } catch (err) {
    console.error('Disease error:', err.message);
    res.status(500).json({ error: 'تصویر کا تجزیہ ناکام رہا — دوبارہ کوشش کریں' });
  }
});

// ─── POST /api/ai/chat ────────────────────────────────────────────────────────
router.post('/chat', aiLimiter, authenticateToken, async (req, res) => {
  try {
    const { messages, language = 'ur' } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'پیغامات ضروری ہیں' });
    }
    if (!flashModel) return res.json({ reply: '⚠️ AI سروس دستیاب نہیں' });

    const systemMap = {
      ur: CHAT_SYSTEM,
      pj: CHAT_SYSTEM + '\nپنجابی یا سرائیکی میں جواب دینا قبول ہے۔',
      en: 'You are DehatiAI, a friendly farming assistant for Punjab, Pakistan. Keep responses concise and practical.'
    };

    const sys = systemMap[language] || systemMap.ur;

    // Build Gemini chat history (all but last message)
    const history = messages.slice(0, -1).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const lastMsg = messages[messages.length - 1];

    const chat = flashModel.startChat({
      systemInstruction: sys,
      history,
      generationConfig: { maxOutputTokens: 450, temperature: 0.8 }
    });

    const result = await chat.sendMessage(lastMsg.content);
    res.json({ reply: result.response.text() });
  } catch (err) {
    console.error('Chat error:', err.message);
    res.status(500).json({ error: 'جواب دینے میں مسئلہ ہوا' });
  }
});

// ─── POST /api/ai/animal ─────────────────────────────────────────────────────
router.post('/animal', aiLimiter, authenticateToken, async (req, res) => {
  try {
    const { animalType, symptoms, question } = req.body;
    if (!flashModel) return res.json({ answer: '⚠️ AI سروس دستیاب نہیں' });

    const prompt = `جانور: ${animalType || 'نامعلوم'}
علامات: ${symptoms || question || 'نامعلوم'}

جانوروں کے ڈاکٹر کی طرح بتائیں:
1. ممکنہ بیماری
2. گھر پر ابتدائی علاج
3. احتیاط
4. کیا فوری ڈاکٹر بلانا ضروری ہے؟

مختصر، آسان اردو میں۔`;

    const text = await generate(prompt, FARMING_SYSTEM, 550);
    res.json({ answer: text });
  } catch (err) {
    console.error('Animal error:', err.message);
    res.status(500).json({ error: 'جواب دینے میں ناکام' });
  }
});

// ─── POST /api/ai/fertilizer ──────────────────────────────────────────────────
router.post('/fertilizer', aiLimiter, authenticateToken, async (req, res) => {
  try {
    const { crop, soilType, stage } = req.body;
    if (!flashModel) return res.json({ answer: '⚠️ AI سروس دستیاب نہیں' });

    const prompt = `فصل: ${crop || 'نامعلوم'}
مٹی: ${soilType || 'عام'}
بڑھوتری کا مرحلہ: ${stage || 'نامعلوم'}

پاکستان میں دستیاب کھادوں کی بنیاد پر بتائیں:
1. کھاد کا نام (اردو/عام نام)
2. فی ایکڑ مقدار
3. ڈالنے کا وقت اور طریقہ
4. خاص احتیاط

مختصر، عملی مشورہ دیں۔`;

    const text = await generate(prompt, FARMING_SYSTEM, 550);
    res.json({ answer: text });
  } catch (err) {
    console.error('Fertilizer error:', err.message);
    res.status(500).json({ error: 'جواب دینے میں ناکام' });
  }
});

module.exports = router;
