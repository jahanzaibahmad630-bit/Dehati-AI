const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { authenticateToken } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimit');

const router = express.Router();

let genAI = null;
let flashModel = null;

if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  flashModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  console.log('✅ Gemini API configured — model: gemini-2.0-flash');
} else {
  console.warn('⚠️  GEMINI_API_KEY not set — AI features disabled');
}

// ─── Dynamic system prompt with real date/season context ─────────────────────
function buildFarmingSystem() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const hour = now.getHours();
  const season = (month >= 5 && month <= 10)
    ? 'خریف (چاول، مکئی، گنا، کپاس، مونگ، ماش)'
    : 'ربیع (گندم، سرسوں، آلو، چنا، مٹر، تارا میرہ)';
  const timeOfDay = hour < 12 ? 'صبح' : hour < 17 ? 'دوپہر' : 'شام';
  const dateStr = now.toLocaleDateString('ur-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return `آپ DehatiAI ہیں — پنجاب، پاکستان کے کسانوں کا ماہر AI مددگار۔
آج: ${dateStr} (${timeOfDay})
موجودہ زرعی موسم: ${season}
مقام: پنجاب، پاکستان

آپ کا کردار — فصلوں، کھادوں، بیماریوں، آبپاشی، منڈی کی قیمتوں اور سرکاری اسکیموں میں ماہرانہ رہنمائی:

اہم ہدایات:
- جواب آسان، عام فہم اردو میں دیں جو ایک گاؤں کا ان پڑھ کسان بھی سمجھ سکے
- مختصر اور عملی جواب دیں (250 الفاظ سے کم) — بلٹ پوائنٹس استعمال کریں
- صرف پاکستان میں آسانی سے ملنے والی دوائیں اور کھادیں تجویز کریں (DAP، یوریا، پوٹاش، سنگل سپر فاسفیٹ وغیرہ)
- موسم اور وقت کے مطابق مشورہ دیں
- اگر بات یقینی نہ ہو تو کہیں: "مقامی زرعی افسر سے ملیں" یا "زراعت ہیلپ لائن 0800-15000 پر کال کریں"
- کبھی من گھڑت یا غلط معلومات نہ دیں
- اعداد اور مقدار واضح لکھیں (مثلاً: 1 بوری DAP فی ایکڑ)`;
}

function buildChatSystem(language) {
  const now = new Date();
  const month = now.getMonth() + 1;
  const season = (month >= 5 && month <= 10) ? 'خریف' : 'ربیع';

  const base = `آپ DehatiAI ہیں — پنجاب کے کسانوں کا دوستانہ AI ساتھی۔
موجودہ موسم: ${season}
سال: ${now.getFullYear()}

انداز: بالکل WhatsApp پر کسی قریبی دوست کی طرح بات کریں — سادہ، دوستانہ، خلوص سے۔
- مختصر اور عملی جوابات دیں (3-5 جملے کافی ہیں)
- لمبے لیکچر سے پرہیز کریں
- کسان جس زبان میں لکھے اسی میں جواب دیں
- سنجیدہ بیماری یا بڑے نقصان پر فوری ماہر سے ملنے کا مشورہ دیں
- زراعت ہیلپ لائن: 0800-15000 (مفت)`;

  if (language === 'pj') return base + '\nپنجابی یا سرائیکی میں جواب دینا قبول ہے۔';
  if (language === 'en') return 'You are DehatiAI, a friendly expert farming assistant for Punjab, Pakistan farmers. Current season: ' + season + '. Keep responses short, practical, and friendly. Recommend Pakistani-available products only. Helpline: 0800-15000';
  return base;
}

function aiUnavailable() {
  return { answer: '⚠️ AI سروس ابھی دستیاب نہیں — GEMINI_API_KEY ترتیب دیں', disabled: true };
}

// Helper: single-turn generation
async function generate(prompt, systemPrompt, maxTokens = 700) {
  const sys = systemPrompt || buildFarmingSystem();
  const result = await flashModel.generateContent({
    contents: [{ role: 'user', parts: [{ text: `${sys}\n\n---\n\n${prompt}` }] }],
    generationConfig: { maxOutputTokens: maxTokens, temperature: 0.6, topP: 0.9 }
  });
  return result.response.text();
}

// ─── POST /api/ai/ask ─────────────────────────────────────────────────────────
router.post('/ask', aiLimiter, authenticateToken, async (req, res) => {
  try {
    const { question } = req.body;
    if (!question?.trim()) return res.status(400).json({ error: 'سوال خالی نہیں ہونا چاہیے' });
    if (!flashModel) return res.json(aiUnavailable());

    const text = await generate(question.trim(), buildFarmingSystem(), 700);
    res.json({ answer: text });
  } catch (err) {
    console.error('AI ask error:', err.message);
    res.status(500).json({ error: 'AI جواب دینے میں ناکام — دوبارہ کوشش کریں' });
  }
});

// ─── POST /api/ai/disease ─────────────────────────────────────────────────────
router.post('/disease', aiLimiter, authenticateToken, async (req, res) => {
  try {
    const { imageBase64, cropName, mimeType = 'image/jpeg' } = req.body;
    if (!imageBase64) return res.status(400).json({ error: 'تصویر ضروری ہے' });
    if (!flashModel) return res.json({ disease: 'AI دستیاب نہیں', cause: '', treatment: '', prevention: '', disabled: true });

    const now = new Date();
    const month = now.getMonth() + 1;
    const season = (month >= 5 && month <= 10) ? 'خریف' : 'ربیع';
    const cropText = cropName ? `فصل: ${cropName}\n` : '';

    const prompt = `آپ ایک ماہر زرعی پیتھالوجسٹ ہیں۔ پنجاب پاکستان کا موسم ${season} ہے۔
${cropText}
اس تصویر میں فصل کی حالت غور سے دیکھ کر بتائیں:

صرف اس فارمیٹ میں جواب دیں (ہر لائن نئی لائن پر):
بیماری: [بیماری/کیڑے کا نام — یا "صحت مند فصل"]
وجہ: [بیماری کی بنیادی وجہ — پھپھوندی/بیکٹیریا/کیڑا/موسم وغیرہ]
علاج: [پاکستان میں ملنے والی دوائی، مقدار، اور طریقہ]
بچاؤ: [آئندہ کے لیے احتیاطی تدابیر]

آسان اردو میں، ہر حصہ 1-2 جملوں میں۔`;

    const result = await flashModel.generateContent({
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { mimeType, data: imageBase64 } },
          { text: prompt }
        ]
      }],
      generationConfig: { maxOutputTokens: 1000, temperature: 0.3, topP: 0.85 }
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
    res.status(500).json({ error: 'تصویر کا تجزیہ ناکام — دوبارہ کوشش کریں' });
  }
});

// ─── POST /api/ai/chat (standard) ────────────────────────────────────────────
router.post('/chat', aiLimiter, authenticateToken, async (req, res) => {
  try {
    const { messages, language = 'ur' } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) return res.status(400).json({ error: 'پیغامات ضروری ہیں' });
    if (!flashModel) return res.json({ reply: '⚠️ AI سروس دستیاب نہیں' });

    const history = messages.slice(0, -1).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));
    const lastMsg = messages[messages.length - 1];

    const chat = flashModel.startChat({
      systemInstruction: buildChatSystem(language),
      history,
      generationConfig: { maxOutputTokens: 500, temperature: 0.85, topP: 0.92 }
    });

    const result = await chat.sendMessage(lastMsg.content);
    res.json({ reply: result.response.text() });
  } catch (err) {
    console.error('Chat error:', err.message);
    res.status(500).json({ error: 'جواب دینے میں مسئلہ ہوا' });
  }
});

// ─── POST /api/ai/chat/stream (Server-Sent Events streaming) ──────────────────
router.post('/chat/stream', aiLimiter, authenticateToken, async (req, res) => {
  try {
    const { messages, language = 'ur' } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'پیغامات ضروری ہیں' });
    }
    if (!flashModel) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.write(`data: ${JSON.stringify({ text: '⚠️ AI سروس دستیاب نہیں' })}\n\n`);
      res.write('data: [DONE]\n\n');
      return res.end();
    }

    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const history = messages.slice(0, -1).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));
    const lastMsg = messages[messages.length - 1];

    const chat = flashModel.startChat({
      systemInstruction: buildChatSystem(language),
      history,
      generationConfig: { maxOutputTokens: 500, temperature: 0.85, topP: 0.92 }
    });

    const streamResult = await chat.sendMessageStream(lastMsg.content);

    for await (const chunk of streamResult.stream) {
      const text = chunk.text();
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('Chat stream error:', err.message);
    try {
      res.write(`data: ${JSON.stringify({ error: 'جواب دینے میں مسئلہ ہوا' })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    } catch {}
  }
});

// ─── POST /api/ai/animal ─────────────────────────────────────────────────────
router.post('/animal', aiLimiter, authenticateToken, async (req, res) => {
  try {
    const { animalType, symptoms, question } = req.body;
    if (!flashModel) return res.json({ answer: '⚠️ AI سروس دستیاب نہیں' });

    const prompt = `جانور: ${animalType || 'نامعلوم'}
علامات: ${symptoms || 'نامعلوم'}
اضافی معلومات: ${question || 'کوئی نہیں'}

پاکستانی جانوروں کے ڈاکٹر کی طرح بتائیں:
1. ممکنہ بیماری یا مسئلہ
2. گھر پر فوری علاج (آسانی سے ملنے والی دوا)
3. کیا کھانا پلانا ہے یا نہیں
4. کیا فوری ڈاکٹر ضروری ہے؟ (ہاں/نہیں اور وجہ)

مختصر، واضح اردو میں — فی پوائنٹ ایک جملہ کافی ہے۔`;

    const text = await generate(prompt, buildFarmingSystem(), 600);
    res.json({ answer: text });
  } catch (err) {
    console.error('Animal error:', err.message);
    res.status(500).json({ error: 'جواب دینے میں ناکام' });
  }
});

// ─── POST /api/ai/fertilizer ──────────────────────────────────────────────────
router.post('/fertilizer', aiLimiter, authenticateToken, async (req, res) => {
  try {
    const { crop, soilType, cropAge } = req.body;
    if (!flashModel) return res.json({ answer: '⚠️ AI سروس دستیاب نہیں' });

    const now = new Date();
    const month = now.getMonth() + 1;
    const season = (month >= 5 && month <= 10) ? 'خریف' : 'ربیع';

    const prompt = `فصل: ${crop || 'نامعلوم'}
مٹی کی قسم: ${soilType || 'عام دوہمی مٹی'}
بڑھوتری کا مرحلہ: ${cropAge || 'نامعلوم'}
موسم: ${season}

پاکستان میں دستیاب کھادوں کے مطابق بتائیں:
1. ابھی کون سی کھاد ڈالیں (نام، مقدار فی ایکڑ)
2. ڈالنے کا طریقہ (زمین میں یا پانی کے ساتھ)
3. اگلا مرحلہ کب اور کیا کریں
4. ایک خاص احتیاط

مختصر اور واضح — قیمت اور دستیابی کا خیال رکھیں۔`;

    const text = await generate(prompt, buildFarmingSystem(), 600);
    res.json({ answer: text });
  } catch (err) {
    console.error('Fertilizer error:', err.message);
    res.status(500).json({ error: 'جواب دینے میں ناکام' });
  }
});

module.exports = router;
