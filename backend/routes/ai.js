const express   = require('express');
const Anthropic  = require('@anthropic-ai/sdk');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { aiLimiter }         = require('../middleware/rateLimit');
const db                    = require('../lib/db');
const aiCache               = require('../lib/aiCache');

const router = express.Router();

// â”€â”€â”€ Claude Client â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ————————————————————————————————————————————————————————————————————————————————
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

// â”€â”€â”€ Agriculture keyword guard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Urdu script keywords
const AGRI_KEYWORDS_UR = [
  // فصلیں
  'فصل','گندم','چاول','مکئی','کپاس','گنا','آلو','ٹماٹر','پیاز','مرچ','لہسن','سرسوں',
  'چنا','مسور','مونگ','ماش','جوار','باجرہ','تل','السی','کماد','دھان','مٹر','تارا میرہ',
  'موٹھ','گوار','سویابین','سورج مکھی','زیتون','انار','آم','کینو','مالٹا','امرود',
  // انپٹ
  'کھاد','DAP','یوریا','پوٹاش','نائٹروجن','فاسفورس','سپرے','زہر','دوائی',
  'بیج','پنیری','ٹیکہ','ٹیکے',
  // کیڑے و بیماری
  'بیماری','کیڑا','سنڈی','تیلا','چیپا','دیمک','پھپھوندی','زنگ','جھلساؤ','کٹوا',
  'سفید مکھی','تھرپس','مکڑی','شائنر',
  // زمین و پانی
  'آبپاشی','پانی','مٹی','زمین','نمی','سیم','تھور','نہر','کھال','نلکی','ڈرپ',
  'ٹیوب ویل','موٹر','پمپ','بارش','اولے','سیلاب','خشک سالی',
  // عملیات
  'بوائی','کٹائی','گوڈی','روٹاویٹر','ہل','ٹریکٹر','تھریشر','کمبائن','کاشت',
  // منڈی
  'منڈی','قیمت','ریٹ','فروخت','خریداری','آڑھتی','اناج','ذخیرہ',
  // جانور
  'گائے','بھینس','بکری','مرغی','جانور','دودھ','چارہ','مویشی','بیل','اونٹ',
  'خرگوش','مچھلی','جھینگا','مرغا','ہانڈی',
  // عمومی
  'زراعت','کسان','کھیت','فارم','باغ','پھل','سبزی','موسم','درجہ حرارت',
  'کسان کارڈ','ZTBL','فصلی بیمہ','زرعی','ہرے چارے','قرضہ','سبسڈی','اسکیم',
  'محکمہ زراعت','زرعی ترقیاتی','ایگری'
];

// English keywords
const AGRI_KEYWORDS_EN = [
  'crop','crops','wheat','rice','cotton','maize','corn','sugarcane','potato','tomato',
  'onion','garlic','mustard','chickpea','lentil','lentils','fertilizer','dap','urea',
  'potash','pesticide','herbicide','fungicide','insecticide','irrigation','soil',
  'seed','seeds','sowing','harvest','farm','farming','agriculture','agricultural',
  'crop disease','pest','pests','spray','cattle','buffalo','goat','poultry',
  'livestock','milk','fodder','weather','rain','drought','mandi','price','kisan',
  'farmer','farmers','field','plant','flower','fruit','vegetable','orchard','garden',
  'tractor','tube well','tubewell','canal','water','manure','compost','organic',
  'yield','acre','kanal','marla','crop rotation','weed','blight','rust','aphid',
  'whitefly','thrips','nematode','nitrogen','phosphorus','potassium','salinity',
  'waterlogging','ztbl','loan','subsidy','scheme','extension','agri','soybean',
  'sunflower','sugarbeet','groundnut','sesame','linseed','fenugreek','coriander',
  'cumin','chilli','pepper','mango','citrus','guava','pomegranate','apricot',
  'drip irrigation','sprinkler','greenhouse','tunnel farming','hydroponics',
  'soil test','ph','fertility','mulching','pruning','grafting','nursery',
  'fish','shrimp','poultry farm','dairy','goat farm'
];

// Roman Urdu keywords (Urdu words written in English letters â€” very common in Pakistan)
const AGRI_KEYWORDS_ROMAN = [
  // Crops
  'fasal','phasal','faslon','gandum','gehu','chawal','dhaan','makkai','makka','maka',
  'kapas','ganna','kamad','aloo','tamatar','pyaz','mirch','lehsan','sarson','sarso',
  'chana','masoor','moong','maash','matar','jowar','bajra','til','alsi','tara mira',
  'soyabean','suraj mukhi',
  // Common questions
  'kb lgayein','kb lagayein','kab lagayein','kab lgana','kab dena','kab spray',
  'kb pani','kab pani','pani kb','pani kab','pani dena','pani lagana',
  'kab bona','kab katna','kab kaatna','kab katai','katai kab',
  // Farming operations  
  'buwai','boi','buai','boai','katai','kaatai','godi','gudi','jotai','jotna',
  'hal chalana','tractor','thresher','combine','rotavator','ridger',
  // Fertilizers / Inputs
  'khaad','khad','dap','urea','potash','nitrogen','spray karna','spray dena',
  'zeher','dawa','dawai','pesticide','fungicide','herbicide','weedicide',
  'beej','bij','seeds','paneeri','paniri',
  // Water / Irrigation
  'pani','paani','abpashi','aab pashi','nehr','naher','nali','tube well','tubewell',
  'motor pump','drip','sprinkler','barish','barsaat','sookha','sel','selab',
  // Pests / Disease
  'beemari','bimari','keera','kira','keere','sundi','soondi','teela','cheepa',
  'deemak','dimak','phaphoond','zang','jhulsao','safed makhi','thrips',
  'makra','makri','locust','tiddi',
  // Soil
  'mitti','mati','zameen','zemin','sem','thor','namak','shora','namkeen',
  // Market / Finance
  'mandi','qeemat','kimat','rate','rait','farookht','bechna','khareedna',
  'arrhti','anaaj','zakheera','qarz','loan','subsidi','scheme',
  'kisan card','kisaan card','ztbl','insaaf','pm kisan',
  // Livestock
  'janwar','jaanwar','gaay','gay','bhains','bhaens','bakri','murgi',
  'murgha','doodh','dood','chara','charha','maweshi','bail','oont',
  'machli','machi','jheenga',
  // General farming words
  'khet','khait','khayt','khyait','farm','baagh','bagh','phal','sabzi',
  'kisaan','kisan','zamindaar','zamindar','hari',
  // Weather
  'mosam','mausam','garmi','sardi','dhoop','barish','olay','aandhi',
  'temperature','darjah hararat',
  // Govt schemes
  'pm loan','kisaan package','agriculture loan','fasal bima',
  'zari taraqiati','agriculture department','extension officer',
  // How-to question starters common in farming context
  'kaise lgayein','kaise lagayein','kaise karna','kaise dena','kaise spray',
  'kitna dena','kitni miqdar','kitnay din','kitne din','per acre','per kanal',
  'har baar','baar baar'
];

// Words that clearly indicate OFF-TOPIC (non-agriculture) queries
const CLEARLY_OFF_TOPIC = [
  // Entertainment
  'movie','film','actor','actress','drama','song','gana','music','cricket','football',
  'match','game','gaming','pubg','tiktok','youtube','instagram','facebook',
  // Politics (not agri-related)
  'election','vote','imran khan','nawaz','zardari','party politics','pm',
  // Tech (not agri-related)
  'mobile','phone','laptop','computer','software','coding','programming','bitcoin',
  // Love/Personal
  'love','pyaar','ishq','larki','larka','shaddi','rishta','divorce',
  // Medical (non-livestock)
  'doctor','hospital','medicine for human','aspirin','fever in human',
  // Other clearly off-topic
  'recipe','cooking','khana pakana','hotel','tourism','travel abroad'
];

function isAgricultureRelated(text) {
  const lower = text.toLowerCase().trim();

  // â”€â”€ Step 1: Check Urdu script â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  for (const kw of AGRI_KEYWORDS_UR) {
    if (text.includes(kw)) return true;
  }

  // â”€â”€ Step 2: Check English â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  for (const kw of AGRI_KEYWORDS_EN) {
    if (lower.includes(kw.toLowerCase())) return true;
  }

  // â”€â”€ Step 3: Check Roman Urdu (biggest gap fixed here) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  for (const kw of AGRI_KEYWORDS_ROMAN) {
    if (lower.includes(kw.toLowerCase())) return true;
  }

  // â”€â”€ Step 4: Smart fallback â€” short or vague messages pass through â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // If message is â‰¤6 words, it's likely a farming question â€” let Claude decide
  const wordCount = lower.trim().split(/\s+/).length;
  if (wordCount <= 6) return true;

  // â”€â”€ Step 5: Check if it's clearly NON-agriculture â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // If it clearly matches off-topic AND no agri context â†’ block
  const isObviouslyOffTopic = CLEARLY_OFF_TOPIC.some(kw => lower.includes(kw.toLowerCase()));
  if (!isObviouslyOffTopic) return true; // Unknown/ambiguous â†’ let Claude answer

  return false; // Only block if clearly off-topic
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


// ——— System Prompts ——————————————————————————————————————————————————————————
function buildFarmingSystem() {
  const now    = new Date();
  const month  = now.getMonth() + 1;
  const hour   = now.getHours();
  const season = (month >= 5 && month <= 10)
    ? 'خریف (چاول، مکئی، گنا، کپاس، مونگ، ماش)'
    : 'ربیع (گندم، سرسوں، آلو، چنا، مٹر، تارا میرا)';
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
- اعداد اور مقدار واضح لکھیں (مثلا: 1 بوری DAP فی ایکڑ)

فارمیٹنگ کے اصول:
- عنوان کے لیے شروع میں ## لگائیں (عنوان کے آخر میں ## نہ لگائیں)
- بلٹ پوائنٹ کے لیے شروع میں - لگائیں (جملے کے آخر میں - نہ لگائیں)
- اہم نام اور مقدار کو **bold** کریں`;
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
- 1-2 مختصر بلٹ پوائنٹس (-) یا پیراگراف کا استعمال کریں
- عنوان کے لیے شروع میں ## اور اہم الفاظ کو **bold** کریں
- عنوان یا جملے کے آخر میں ## یا - نہ لگائیں
- زراعت ہیلپ لائن: 0800-15000 (مفت)`;


  if (language === 'pj') return base + '\nپنجابی یا سرائیکی میں جواب دینا قبول ہے';
  return base;
}

function aiUnavailable() {
  return { answer: '⚠️ AI سروس ابھی دستیاب نہیں — CLAUDE_API_KEY ترتیب دیں', disabled: true };
}

// ——— Helpers —————————————————————————————————————————————————————————————————
async function claudeAsk(prompt, systemPrompt, maxTokens = 700, temperature = 0.6) {
  const sysText = systemPrompt || buildFarmingSystem();
  const response = await claude.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: maxTokens,
    temperature,
    // Anthropic Prompt Caching: caches system prompt for 5 min, saves ~90% token cost
    system: [{ type: 'text', text: sysText, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: prompt }]
  });
  // Non-blocking token tracking (fire and forget)
  if (response?.usage) {
    const db = require('../lib/db');
    db.logAIUsage({
      endpoint: 'ask',
      tokensIn:    response.usage.input_tokens || 0,
      tokensOut:   response.usage.output_tokens || 0,
      cacheTokens: response.usage.cache_read_input_tokens || 0
    }).catch(() => {});
  }
  return response.content?.[0]?.text ?? '';
}

// ——— POST /api/ai/ask ——————————————————————————————————————————————————————
router.post('/ask', aiLimiter, optionalAuth, async (req, res) => {
  try {
    const { question, language = 'ur' } = req.body;
    if (!question?.trim()) return res.status(400).json({ error: 'سوال خالی نہیں ہونا چاہیے' });
    if (!claude)           return res.json(aiUnavailable());

    const q = question.trim().slice(0, 1000); // safety length cap

    // Fast keyword guard
    if (!isAgricultureRelated(q)) {
      return res.json({ answer: OFF_TOPIC_UR, offTopic: true });
    }

    // M4 fix: Cache lookup — reuse previous answers for identical questions
    const cached = await aiCache.get(q, language);
    if (cached) return res.json({ answer: cached, fromCache: true });

    const text = await claudeAsk(q, buildFarmingSystem(), 700, 0.6);

    // M4 fix: Save to cache for future requests
    if (text) aiCache.set(q, language, text);

    res.json({ answer: text });
  } catch (err) {
    console.error('AI ask error:', err.message);
    res.status(500).json({ error: 'AI جواب دینے میں ناکام — دوبارہ کوشش کریں' });
  }
});

// ——— POST /api/ai/disease ———————————————————————————————————————————————————
router.post('/disease', aiLimiter, authenticateToken, async (req, res) => {
  try {
    const { imageBase64, cropName, mimeType = 'image/jpeg' } = req.body;
    if (!imageBase64) return res.status(400).json({ error: 'تصویر ضروری ہے' });
    if (!claude)       return res.json({ disease: 'AI دستیاب نہیں', cause: '', treatment: '', prevention: '', disabled: true });

    // Security: whitelist MIME types
    const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const safeMime = ALLOWED_MIME.includes(mimeType) ? mimeType : 'image/jpeg';

    const month  = new Date().getMonth() + 1;
    const season = (month >= 5 && month <= 10) ? 'خریف (Kharif)' : 'ربیع (Rabi)';
    const cropText = cropName ? `Crop specified by farmer: ${cropName}\n` : 'Crop: not specified by farmer — identify from image if possible\n';

    // Expert-level system prompt
    const systemPrompt = `You are Dr. Zara — a senior plant pathologist and agronomist with 20+ years of experience in Punjab, Pakistan. You have diagnosed thousands of crop diseases across wheat, rice, cotton, sugarcane, maize, vegetables, and fruits in Pakistani conditions.

YOUR EXPERTISE includes:
- All major Punjab crop diseases: wheat rust (yellow/brown/black), blast, blight, smut, Karnal bunt, powdery mildew
- Cotton diseases: CLCuD (Cotton Leaf Curl), bacterial blight, Alternaria leaf spot, boll rot
- Vegetable diseases: early/late blight (tomato/potato), downy mildew, fusarium wilt
- Pest damage visual patterns: aphids, whitefly, thrips, stem borer, army worm, mites
- Nutrient deficiencies that look like disease: nitrogen (yellowing), iron chlorosis, zinc deficiency
- Abiotic stress: heat stress, waterlogging, herbicide damage, spray burn

VISUAL INSPECTION PROTOCOL — examine the image for:
1. Leaf color changes (yellowing, browning, purpling, whitening)
2. Lesion patterns (spots, blotches, stripes, rings, halos)
3. Lesion texture (water-soaked, dry, powdery, oily, sunken)
4. Distribution (lower leaves first = soil-borne; upper = air-borne; random = insect)
5. Stem/root symptoms if visible
6. Fruiting bodies, spores, mycelium if visible
7. Insect presence, frass, or feeding damage patterns
8. Overall plant vigor and canopy color

RESPONSE RULES:
- Be SPECIFIC — name the exact disease/pest, not just "fungal infection"
- If multiple diseases possible, list the most likely one first
- Always consider the season context
- Confidence: if image is unclear, say so honestly but still give best diagnosis
- Use both Urdu AND common English name for each disease
- Recommend ONLY medicines available in Pakistan (Topsin-M, Dithane M-45, Ridomil, Confidor, Actara, Karate, Coragen etc.)`;

    const prompt = `Season: ${season}
${cropText}
TASK: Carefully examine every part of this crop image and provide a detailed disease/pest diagnosis.

Respond STRICTLY in this exact format (use these exact Urdu labels):

بیماری: [Exact disease/pest name in Urdu + English — e.g., "گندم کا پیلا زنگ (Yellow Rust / Stripe Rust)"]
شدت: [ہلکی / درمیانی / شدید — based on what you see]
اعتماد: [کم / درمیانہ / زیادہ — your confidence in this diagnosis]
وجہ: [Exact pathogen or cause — fungus/bacteria/virus/insect/nutrient deficiency — be specific]
علامات: [What you can see in THIS image — describe 2-3 visual symptoms]
علاج: [Step-by-step treatment with spray name + dose. Pakistan-available products only]
احتیاط: [1-2 prevention tips for next season]
فوری ادارۆ: [Yes/No — urgently consult agronomist?]`;

    const response = await claude.messages.create({
      model: CLAUDE_MODEL_VIS,
      max_tokens: 600,
      system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: safeMime, data: imageBase64 } },
          { type: 'text',  text: prompt }
        ]
      }]
    });

    const raw = response.content?.[0]?.text ?? '';
    const extract = (label) => {
      const rx = new RegExp(label + '[:\\s]+([^\\n]+)');
      return raw.match(rx)?.[1]?.trim() || '';
    };
    res.json({
      disease:    extract('بیماری') || raw,
      severity:   extract('شدت'),
      confidence: extract('اعتماد'),
      cause:      extract('وجہ'),
      symptoms:   extract('علامات'),
      treatment:  extract('علاج'),
      prevention: extract('احتیاط'),
      urgent:     extract('فوری ادارۆ'),
      raw
    });
  } catch (err) {
    console.error('Disease error:', err.message);
    res.status(500).json({ error: 'تجزیہ ناکام — دوبارہ کوشش کریں' });
  }
});

// ——— POST /api/ai/fertilizer ————————————————————————————————————————————————
router.post('/fertilizer', aiLimiter, authenticateToken, async (req, res) => {
  try {
    // M7 fix: Truncate inputs to prevent excessively long prompts reaching Claude
    const crop     = ((req.body.crop     || '') + '').slice(0, 100);
    const soilType = ((req.body.soilType || '') + '').slice(0, 100);
    const cropAge  = ((req.body.cropAge  || '') + '').slice(0, 100);
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

مختصر اور واضح — قیمت اور دستیابی کا خیال رکھیں`;

    const text = await claudeAsk(prompt, buildFarmingSystem(), 600, 0.5);
    res.json({ answer: text });
  } catch (err) {
    console.error('Fertilizer error:', err.message);
    res.status(500).json({ error: 'جواب دینے میں ناکام' });
  }
});

// ─── POST /api/ai/chat/stream (SSE streaming) ───────────────────────────────
router.post('/chat/stream', aiLimiter, optionalAuth, async (req, res) => {
  // H5 fix: declare heartbeat BEFORE try so it is accessible in catch block
  let heartbeat;
  try {
    const { messages, language = 'ur' } = req.body;
    if (!Array.isArray(messages) || messages.length === 0)
      return res.status(400).json({ error: 'پیغامات ضروری ہیں' });

    const lastMsg = messages[messages.length - 1];

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

    // Off-topic guard
    if (lastMsg.role === 'user' && !isAgricultureRelated(lastMsg.content)) {
      res.write(`data: ${JSON.stringify({ text: OFF_TOPIC_UR })}\n\n`);
      res.write('data: [DONE]\n\n');
      return res.end();
    }

    // CRITICAL FIX: Start heartbeat IMMEDIATELY after SSE setup.
    // Must be before cache lookup — if DB hangs on getCacheFromDB(), the handler
    // freezes and the client sees "..." forever. Heartbeat forces keep-alive.
    heartbeat = setInterval(() => { try { res.write(': ping\n\n'); } catch {} }, 8000);

    // Cleanup on client disconnect (prevents heartbeat interval leak)
    req.on('close', () => { clearInterval(heartbeat); });

    // Optional: disable Nagle's algorithm to prevent Railway proxy buffering
    try { if (req.socket) { req.socket.setNoDelay(true); } } catch {}

    // ——— Cache lookup with 3-second timeout (prevents DB TCP hang) ———
    const userMessages = messages.filter(m => m.role === 'user');
    if (lastMsg.role === 'user' && userMessages.length === 1) {
      const cacheTimeout = new Promise(resolve => setTimeout(() => resolve(null), 3000));
      const cached = await Promise.race([aiCache.get(lastMsg.content, language), cacheTimeout]);
      if (cached) {
        // Stream cached answer in chunks (feels like live streaming)
        res.setHeader('X-Cache', 'HIT');
        const chunkSize = 30;
        for (let i = 0; i < cached.length; i += chunkSize) {
          res.write(`data: ${JSON.stringify({ text: cached.slice(i, i + chunkSize) })}\n\n`);
          // Tiny delay so UI renders progressively
          await new Promise(r => setTimeout(r, 8));
        }
        clearInterval(heartbeat);
        res.write('data: [DONE]\n\n');
        return res.end();
      }
    }

    res.setHeader('X-Cache', 'MISS');

    const claudeMessages = messages.map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content
    }));

    // Stream with Claude
    let fullReply = '';
    const stream = claude.messages.stream({
      model: CLAUDE_MODEL,
      max_tokens: 500,
      temperature: 0.65,
      system: [{ type: 'text', text: buildChatSystem(language), cache_control: { type: 'ephemeral' } }],
      messages: claudeMessages
    });

    // Handle Claude stream errors (prevents unhandled rejection if Claude crashes mid-stream)
    stream.on('error', (streamErr) => {
      console.error('Claude stream error:', streamErr.message);
      clearInterval(heartbeat);
      try {
        res.write(`data: ${JSON.stringify({ error: 'AI سروس میں خرابی' })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
      } catch {}
    });

    stream.on('text', (text) => {
      if (text) {
        fullReply += text;
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    });

    const finalMsg = await stream.finalMessage();
    // Non-blocking token tracking (fire and forget)
    if (finalMsg?.usage) {
      const db = require('../lib/db');
      db.logAIUsage({
        endpoint: 'ask',
        tokensIn:    finalMsg.usage.input_tokens || 0,
        tokensOut:   finalMsg.usage.output_tokens || 0,
        cacheTokens: finalMsg.usage.cache_read_input_tokens || 0
      }).catch(() => {});
    }
    clearInterval(heartbeat);
    res.write('data: [DONE]\n\n');
    res.end();

    // Post-response: save to cache + chat_logs (non-blocking)
    if (lastMsg.role === 'user' && fullReply) {
      // Cache only single-turn answers (context-free)
      if (userMessages.length === 1) {
        aiCache.set(lastMsg.content, language, fullReply);
      }
      db.saveChatLog({
        userId:    req.user?.id    || null,
        userName:  req.user?.name  || null,
        userPhone: req.user?.phone || null,
        question:  lastMsg.content,
        answer:    fullReply,
        language
      }).catch(() => {});
    }

  } catch (err) {
    console.error('Chat stream error:', err.message);
    try {
      clearInterval(heartbeat); // now accessible since declared before try
      res.write(`data: ${JSON.stringify({ error: 'جواب دینے میں مسئلہ ہوا' })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    } catch {}
  }
});
// ——— POST /api/ai/animal ———————————————————————————————————————————————————
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

مختصر، واضح اردو میں — فی پوائنٹ ایک جملہ کافی ہے`;

    const text = await claudeAsk(prompt, buildFarmingSystem(), 600, 0.5);
    res.json({ answer: text });
  } catch (err) {
    console.error('Animal error:', err.message);
    res.status(500).json({ error: 'جواب دینے میں ناکام' });
  }
});
module.exports = router;
