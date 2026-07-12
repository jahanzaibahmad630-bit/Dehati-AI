const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const { authenticateToken } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimit');

const router = express.Router();

// ─── Claude Client ─────────────────────────────────────────────────────────────
let claude = null;

if (process.env.CLAUDE_API_KEY) {
  claude = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });
  console.log('✅ Claude API configured — model: claude-sonnet-4-5');
} else {
  console.warn('⚠️  CLAUDE_API_KEY not set — AI features disabled');
}

// claude-sonnet-4-5 = Claude Sonnet 4.x (platform.claude.com enterprise)
const CLAUDE_MODEL     = 'claude-sonnet-4-5';
const CLAUDE_MODEL_VIS = 'claude-sonnet-4-5'; // supports vision

// ─── Agriculture keyword guard (saves API calls for obvious off-topic) ─────────
const AGRI_KEYWORDS_UR = [
  'فصل','گندم','چاول','مکئی','کپاس','گنا','آلو','ٹماٹر','پیاز','مرچ','لہسن','سرسوں',
  'چنا','مسور','مونگ','ماش','جوار','باجرہ','تل','السی','کھاد','DAP','یوریا','پوٹاش',
  'سپرے','بیماری','کیڑا','سنڈی','تیلا','آبپاشی','پانی','مٹی','زمین','بیج','بوائی',
  'کٹائی','منڈی','قیمت','گائے','بھینس','بکری','مرغی','جانور','دودھ','چارہ','زراعت',
  'کسان','کھیت','فارم','موسم','بارش','درجہ حرارت','نہر','ٹیوب ویل','ٹریکٹر','ہل',
  'کسان کارڈ','ZTBL','فصلی بیمہ','زرعی','ہرے چارے','باغ','پھل','سبزی','کھاد','نائٹروجن'
];

const AGRI_KEYWORDS_EN = [
  'crop','wheat','rice','cotton','maize','corn','sugarcane','potato','tomato','onion',
  'garlic','mustard','chickpea','lentil','fertilizer','dap','urea','potash','pesticide',
  'herbicide','fungicide','insecticide','irrigation','soil','seed','sowing','harvest',
  'farm','farming','agriculture','crop disease','pest','spray','cattle','buffalo','goat',
  'poultry','livestock','milk','fodder','weather','rain','drought','mandi','price',
  'kisan','farmer','field','plant','flower','fruit','vegetable','orchard','garden',
  'tractor','tube well','canal','water','manure','compost','organic','yield','acre',
  'kanal','marla','crop rotation','weed','blight','rust','aphid','whitefly','thrips',
  'nematode','nitrogen','phosphorus','potassium','ph','salinity','waterlogging','ZTBL',
  'loan','subsidy','scheme','extension','agri'
];

function isAgricultureRelated(text) {
  const lower = text.toLowerCase();
  for (const kw of AGRI_KEYWORDS_EN) {
    if (lower.includes(kw)) return true;
  }
  for (const kw of AGRI_KEYWORDS_UR) {
    if (text.includes(kw)) return true;
  }
  return false;
}

const OFF_TOPIC_UR = `معذرت! 🌾 میں DehatiAI ہوں — صرف زراعت، فصلوں، جانوروں اور کسانی سے متعلق سوالات کا جواب دے سکتا ہوں۔

براہ کرم ان میں سے کوئی موضوع پوچھیں:
• فصلوں کی بیماریاں اور علاج
• کھاد اور سپرے کا مشورہ
• آبپاشی اور موسم
• منڈی کی قیمتیں
• جانوروں کی صحت
• حکومتی زرعی اسکیمیں

زراعت ہیلپ لائن: 0800-15000 (مفت)`;

// ─── System Prompts ────────────────────────────────────────────────────────────
function buildFarmingSystem() {
  const now    = new Date();
  const month  = now.getMonth() + 1;
  const hour   = now.getHours();
  const season = (month >= 5 && month <= 10)
    ? 'خریف (چاول، مکئی، گنا، کپاس، مونگ، ماش)'
    : 'ربیع (گندم، سرسوں، آلو، چنا، مٹر، تارا میرہ)';
  const timeOfDay = hour < 12 ? 'صبح' : hour < 17 ? 'دوپہر' : 'شام';
  const dateStr = now.toLocaleDateString('ur-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return `آپ DehatiAI ہیں — پنجاب، پاکستان کے کسانوں کا ماہر AI مددگار۔
آج: ${dateStr} (${timeOfDay})
موجودہ زرعی موسم: ${season}
مقام: پنجاب، پاکستان

⚠️ انتہائی ضروری: آپ صرف اور صرف زراعت، فصلوں، جانوروں، کھاد، بیماریوں، آبپاشی، منڈی قیمتوں اور کسانی سے متعلق سوالات کا جواب دیں گے۔ اگر کوئی سوال زراعت سے بالکل غیر متعلق ہو (جیسے سیاست، فلم، کھیل، کوڈنگ وغیرہ) تو صرف یہ کہیں: "معذرت، میں صرف زرعی موضوعات پر بات کر سکتا ہوں۔"

آپ کا کردار:
- فصلوں، کھادوں، بیماریوں، آبپاشی، منڈی قیمتوں اور سرکاری اسکیموں میں ماہرانہ رہنمائی
- جواب آسان، عام فہم اردو میں (گاؤں کا ان پڑھ کسان بھی سمجھ سکے)
- مختصر اور عملی جواب (250 الفاظ سے کم) — بلٹ پوائنٹس استعمال کریں
- صرف پاکستان میں آسانی سے ملنے والی دوائیں اور کھادیں تجویز کریں
- موسم اور وقت کے مطابق مشورہ دیں
- غیر یقینی ہو تو: "مقامی زرعی افسر سے ملیں" یا "زراعت ہیلپ لائن 0800-15000"
- کبھی غلط معلومات نہ دیں
- اعداد اور مقدار واضح لکھیں (مثلاً: 1 بوری DAP فی ایکڑ)`;
}

function buildChatSystem(language) {
  const now    = new Date();
  const month  = now.getMonth() + 1;
  const season = (month >= 5 && month <= 10) ? 'خریف' : 'ربیع';
  const year   = now.getFullYear();

  const agriOnlyRule = language === 'en'
    ? 'CRITICAL: You ONLY answer agriculture, farming, crops, livestock, soil, weather and rural Pakistan related questions. For ANY other topic, respond: "Sorry, I can only help with agriculture and farming topics. Please ask about crops, fertilizers, diseases, irrigation, livestock, or government schemes."'
    : `⚠️ اہم: آپ صرف زراعت، فصلوں، جانوروں، مٹی، موسم اور دیہی پاکستان سے متعلق سوالات کا جواب دیں گے۔ کوئی بھی غیر زرعی سوال آنے پر صرف کہیں: "معذرت، میں صرف زرعی موضوعات پر بات کر سکتا ہوں۔ فصل، کھاد، بیماری، آبپاشی، جانور یا اسکیموں سے متعلق پوچھیں۔"`;

  if (language === 'en') {
    return `You are DehatiAI, a friendly expert farming assistant for Punjab, Pakistan farmers.
Current season: ${season} | Year: ${year}
${agriOnlyRule}
Style: Talk like a knowledgeable farming friend on WhatsApp — short, practical, warm.
Keep responses under 5 sentences. Recommend Pakistani-available products only.
Helpline: 0800-15000 (free)`;
  }

  const base = `آپ DehatiAI ہیں — پنجاب کے کسانوں کا دوستانہ AI ساتھی۔
موجودہ موسم: ${season} | سال: ${year}
${agriOnlyRule}

انداز: بالکل WhatsApp پر کسی قریبی دوست کی طرح — سادہ، دوستانہ، مختصر (3-5 جملے)
- کسان جس زبان میں لکھے اسی میں جواب دیں
- لمبے لیکچر سے پرہیز
- سنجیدہ بیماری پر: فوری ماہر سے ملنے کا مشورہ
- زراعت ہیلپ لائن: 0800-15000 (مفت)`;

  if (language === 'pj') return base + '\nپنجابی یا سرائیکی میں جواب دینا قبول ہے۔';
  return base;
}

function aiUnavailable() {
  return { answer: '⚠️ AI سروس ابھی دستیاب نہیں — CLAUDE_API_KEY ترتیب دیں', disabled: true };
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
async function claudeAsk(prompt, systemPrompt, maxTokens = 700, temperature = 0.6) {
  const response = await claude.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: maxTokens,
    temperature,
    system: systemPrompt || buildFarmingSystem(),
    messages: [{ role: 'user', content: prompt }]
  });
  return response.content?.[0]?.text ?? '';
}

// ─── POST /api/ai/ask ──────────────────────────────────────────────────────────
router.post('/ask', aiLimiter, authenticateToken, async (req, res) => {
  try {
    const { question } = req.body;
    if (!question?.trim()) return res.status(400).json({ error: 'سوال خالی نہیں ہونا چاہیے' });
    if (!claude)           return res.json(aiUnavailable());

    // Fast keyword guard
    if (!isAgricultureRelated(question.trim())) {
      return res.json({ answer: OFF_TOPIC_UR, offTopic: true });
    }

    const text = await claudeAsk(question.trim(), buildFarmingSystem(), 700, 0.6);
    res.json({ answer: text });
  } catch (err) {
    console.error('AI ask error:', err.message);
    res.status(500).json({ error: 'AI جواب دینے میں ناکام — دوبارہ کوشش کریں' });
  }
});

// ─── POST /api/ai/disease ──────────────────────────────────────────────────────
router.post('/disease', aiLimiter, authenticateToken, async (req, res) => {
  try {
    const { imageBase64, cropName, mimeType = 'image/jpeg' } = req.body;
    if (!imageBase64) return res.status(400).json({ error: 'تصویر ضروری ہے' });
    if (!claude)       return res.json({ disease: 'AI دستیاب نہیں', cause: '', treatment: '', prevention: '', disabled: true });

    // Security: whitelist MIME types — never pass user input directly to Claude
    const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const safeMime = ALLOWED_MIME.includes(mimeType) ? mimeType : 'image/jpeg';
    const month  = new Date().getMonth() + 1;
    const season = (month >= 5 && month <= 10) ? 'خریف' : 'ربیع';
    const cropText = cropName ? `فصل: ${cropName}\n` : '';

    const prompt = `آپ ایک ماہر زرعی پیتھالوجسٹ ہیں۔ پنجاب پاکستان میں ${season} کا موسم ہے۔
${cropText}
اس تصویر میں فصل کی حالت غور سے دیکھ کر بتائیں:

صرف اس فارمیٹ میں جواب دیں:
بیماری: [بیماری/کیڑے کا نام — یا "صحت مند فصل"]
وجہ: [بیماری کی بنیادی وجہ — پھپھوندی/بیکٹیریا/کیڑا/موسم]
علاج: [پاکستان میں ملنے والی دوائی، مقدار، طریقہ]
بچاؤ: [آئندہ کے لیے احتیاطی تدابیر]

آسان اردو میں، ہر حصہ 1-2 جملوں میں۔`;

    const response = await claude.messages.create({
      model: CLAUDE_MODEL_VIS,
      max_tokens: 1000,
      temperature: 0.2,
      system: `آپ پنجاب، پاکستان کے لیے ماہر زرعی بیماری تشخیص کار ہیں۔ صرف فصلوں اور پودوں کی بیماریاں تشخیص کریں۔ ہمیشہ پاکستان میں دستیاب علاج تجویز کریں۔`,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: safeMime, data: imageBase64 }
          },
          { type: 'text', text: prompt }
        ]
      }]
    });

    const text = response.content[0].text;
    const extract = (field) => {
      const match = text.match(new RegExp(`${field}:\\s*(.+?)(?=\\n\\S|$)`, 's'));
      return match ? match[1].trim() : '';
    };

    res.json({
      disease: extract('بیماری'),
      cause:   extract('وجہ'),
      treatment: extract('علاج'),
      prevention: extract('بچاؤ'),
      rawText: text
    });
  } catch (err) {
    console.error('Disease error:', err.message);
    res.status(500).json({ error: 'تصویر کا تجزیہ ناکام — دوبارہ کوشش کریں' });
  }
});

// ─── POST /api/ai/chat ─────────────────────────────────────────────────────────
router.post('/chat', aiLimiter, authenticateToken, async (req, res) => {
  try {
    const { messages, language = 'ur' } = req.body;
    if (!Array.isArray(messages) || messages.length === 0)
      return res.status(400).json({ error: 'پیغامات ضروری ہیں' });
    if (!claude) return res.json({ reply: '⚠️ AI سروس دستیاب نہیں' });

    const lastMsg = messages[messages.length - 1];

    // Fast keyword check on last user message
    if (lastMsg.role === 'user' && !isAgricultureRelated(lastMsg.content)) {
      return res.json({ reply: OFF_TOPIC_UR, offTopic: true });
    }

    // Build Claude-format messages (alternating user/assistant)
    const claudeMessages = messages.map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content
    }));

    const response = await claude.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 500,
      temperature: 0.65,
      system: buildChatSystem(language),
      messages: claudeMessages
    });

    res.json({ reply: response.content?.[0]?.text ?? '' });
  } catch (err) {
    console.error('Chat error:', err.message);
    res.status(500).json({ error: 'جواب دینے میں مسئلہ ہوا' });
  }
});

// ─── POST /api/ai/chat/stream (SSE streaming) ─────────────────────────────────
router.post('/chat/stream', aiLimiter, authenticateToken, async (req, res) => {
  try {
    const { messages, language = 'ur' } = req.body;
    if (!Array.isArray(messages) || messages.length === 0)
      return res.status(400).json({ error: 'پیغامات ضروری ہیں' });

    // SSE headers
    res.setHeader('Content-Type',  'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection',    'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    if (!claude) {
      res.write(`data: ${JSON.stringify({ text: '⚠️ AI سروس دستیاب نہیں' })}\n\n`);
      res.write('data: [DONE]\n\n');
      return res.end();
    }

    const lastMsg = messages[messages.length - 1];

    // Off-topic guard
    if (lastMsg.role === 'user' && !isAgricultureRelated(lastMsg.content)) {
      res.write(`data: ${JSON.stringify({ text: OFF_TOPIC_UR })}\n\n`);
      res.write('data: [DONE]\n\n');
      return res.end();
    }

    const claudeMessages = messages.map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content
    }));

    // Keep-alive heartbeat — prevents Railway/Nginx 30s timeout during Claude think time
    const heartbeat = setInterval(() => { try { res.write(': ping\n\n'); } catch {} }, 15000);

    // Stream with Claude
    const stream = claude.messages.stream({
      model: CLAUDE_MODEL,
      max_tokens: 500,
      temperature: 0.65,
      system: buildChatSystem(language),
      messages: claudeMessages
    });

    stream.on('text', (text) => {
      if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`);
    });

    await stream.finalMessage();
    clearInterval(heartbeat);
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('Chat stream error:', err.message);
    try {
      clearInterval(heartbeat);
      res.write(`data: ${JSON.stringify({ error: 'جواب دینے میں مسئلہ ہوا' })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    } catch {}
  }
});

// ─── POST /api/ai/animal ──────────────────────────────────────────────────────
router.post('/animal', aiLimiter, authenticateToken, async (req, res) => {
  try {
    const { animalType, symptoms, question } = req.body;
    if (!animalType && !symptoms && !question)
      return res.status(400).json({ error: 'جانور کی قسم یا علامات ضروری ہیں' });
    if (!claude) return res.json({ answer: '⚠️ AI سروس دستیاب نہیں' });

    const prompt = `جانور: ${animalType || 'نامعلوم'}
علامات: ${symptoms || 'نامعلوم'}
اضافی معلومات: ${question || 'کوئی نہیں'}

پاکستانی جانوروں کے ڈاکٹر کی طرح بتائیں:
1. ممکنہ بیماری یا مسئلہ
2. گھر پر فوری علاج (آسانی سے ملنے والی دوا)
3. کیا کھانا پلانا ہے یا نہیں
4. کیا فوری ڈاکٹر ضروری ہے؟ (ہاں/نہیں اور وجہ)

مختصر، واضح اردو میں — فی پوائنٹ ایک جملہ کافی ہے۔`;

    const text = await claudeAsk(prompt, buildFarmingSystem(), 600, 0.5);
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
    if (!claude) return res.json({ answer: '⚠️ AI سروس دستیاب نہیں' });

    const month  = new Date().getMonth() + 1;
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

    const text = await claudeAsk(prompt, buildFarmingSystem(), 600, 0.5);
    res.json({ answer: text });
  } catch (err) {
    console.error('Fertilizer error:', err.message);
    res.status(500).json({ error: 'جواب دینے میں ناکام' });
  }
});

module.exports = router;
