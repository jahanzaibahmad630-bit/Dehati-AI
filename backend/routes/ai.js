const express   = require('express');
const Anthropic  = require('@anthropic-ai/sdk');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { aiLimiter, diseaseLimiter } = require('../middleware/rateLimit');
const db                    = require('../lib/db');
const aiCache               = require('../lib/aiCache');
const livestockDb           = require('../lib/livestockDatabase.json');

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

  return `آپ DehatiAI ہیں — پنجاب، پاکستان کے کسانوں کا ماہر AI مددگار (UAF زرعی یونیورسٹی فیصل آباد، AARI، اور NARC اسلام آباد کی تحقیق کے ساتھ تقویت یافتہ)۔
آج: ${dateStr} (${timeOfDay})
موجودہ زرعی موسم: ${season}
مقام: پنجاب، پاکستان

📚 UAF & NARC سائنسی تحقیقاتی بنیاد (RAG Knowledge Engine):
جب فصل کی قسم، مٹی کی اصلاح، یا کیڑے مار ادویات پوچھی جائیں تو درج ذیل مصدقہ ریسرچ ڈیٹا استعمال کریں:
- گندم اقسام (کلراٹھی/سیم مٹی): اکبر-19، دلکش-20، سبحانی-21 — UAF Soil Science Dept Research 2024
- کپاس اقسام (گرمی و گلابی سنڈی مزاحم): CKC-1، FH-333 — AARI Faisalabad Advisory Bulletin 2025
- روغنی اجناس (کم پانی): TS-5 تل، Super Canola کینولا — NARC Islamabad Oilseeds Division 2025
- اعلیٰ منافع بخش باغات و فصلیں: NARC G1 گارلک (لہسن) — 150-200 من فی ایکڑ | مورنگا (سوہانجنا) — NARC High-Value Crop Protocol
- سیم و تھور مٹی اصلاح: جپسم 80-mesh 400 کلو فی ایکڑ (pH > 8.5) — UAF Agronomy Dept Protocol
- کاربن کریڈٹس و فضائی آلودگی بچاؤ: فصل کی باقیات (پرالی) کو نہ جلائیں، بائیوچار (Biochar) اور گرین کریڈٹ اپنائیں۔
- DRAP رجسٹرڈ ادویات: Nativo 75WG، Ridomil Gold، Confidor 200SL، Indofil M-45
جواب کے آخر میں یہ سائنسی حوالہ شامل کریں جب متعلقہ ہو: 📚 ماخذ: زرعی یونیورسٹی فیصل آباد (UAF) / NARC اسلام آباد / AARI

📊 منڈی لائیو قیمتیں و مالیاتی فیصلوں کا انجن (Punjab Mandi Intelligence):
پنجاب کی غلہ منڈیوں کے تازہ ترین اوسط ریٹ:
- ملتان (Multan): گندم ₨3,200/40کلو | کپاس ₨8,500/40کلو | چاول باسمتی ₨4,100/40کلو
- فیصل آباد (Faisalabad): گندم ₨3,180/40کلو | گنا ₨450/40کلو | مکئی ₨2,450/40کلو
- سرگودھا (Sargodha): گندم ₨3,220/40کلو | کنو ₨2,200/100عدد
- رحیم یار خان (Rahim Yar Khan): کپاس ₨8,600/40کلو | گندم ₨3,190/40کلو

💡 مالیاتی فروخت کا مشورہ (Selling Advisory Rules):
جب کسان فصل فروخت کرنے کے بارے میں پوچھے (مثلاً "کیا میں آج مال بیچ دوں؟"):
1. متعلقہ ضلع کا منڈی ریٹ بتائیں۔
2. موسم کی صورتحال (بارش/تیز ہوا) سے جوڑیں۔
3. واضح عملی مشورہ دیں: "آج ہی فروخت کریں" (اگر بارش کا امکان ہو تاکہ نمی سے بچا جا سکے) یا "3-5 دن انتظار کریں" (اگر قیمتیں بڑھنے کا امکان ہو)۔

⚠️ انتہائی ضروری: آپ صرف اور صرف زراعت، فصلوں، جانوروں، کھاد، بیماریوں، آبپاشی، منڈی قیمتوں اور کسانی سے متعلق سوالات کا جواب دیں گے۔ اگر کوئی سوال زراعت سے بالکل غیر متعلق ہو (جیسے سیاست، فلم، کھیل، کوڈنگ وغیرہ) تو صرف یہ کہیں: "معذرت، میں صرف زرعی موضوعات پر بات کر سکتا ہوں۔"

آپ کا کردار:
- فصلوں، کھادوں، بیماریوں، آبپاشی، منڈی قیمتوں اور سرکاری اسکیموں میں ماہرانہ رہنمائی
- جواب آسان، عام فہم اردو میں (گاؤں کا کسان بھی سمجھ سکے)
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

  if (language === 'en') {
    return `You are DehatiAI, an expert agricultural assistant for farmers in Punjab, Pakistan.
Current season: ${season} | Year: ${year}
CRITICAL: You ONLY answer agriculture, farming, crops, livestock, soil, weather and rural Pakistan related questions. For ANY non-agricultural question, respond ONLY: "Sorry, I can only help with agriculture and farming topics. Please ask about crops, fertilizers, diseases, irrigation, livestock, or government schemes."

Style: Helpful, professional, clear English for Pakistani farmers.
Formatting rules:
- Use ## for headers (do NOT put ## at the end of a header)
- Use - for bullet points (do NOT put - at the end of a line)
- Use **bold** for key names and dosages
Helpline: 0800-15000 (free)`;
  }

  if (language === 'pa' || language === 'pj') {
    return `تسی DehatiAI او — پنجاب دے کسناں دے ماہر زرعی مددگار۔
موجودہ موسم: ${season} | سال: ${year}
⚠️ اہم: تسی صرف زراعت، فصلاں، ڈنگراں، کھاد، بیماریاں، آبپاشی، تے منڈی ریٹاں توں متعلق سوالاں دا جواب دیو گے۔ کسے بھی غیر زرعی سوال لئی صرف آکھو: "معذرت، میں صرف زرعی سوالاں دا جواب دے سکدا واں۔"

زبان و انداز:
- تمام جواب خالص شاہ مکھی پنجابی (Shahmukhi Punjabi) وچ دیو۔
- سادہ، دوستانہ، تے مختصر جواب (3-5 جملے۔ مثال: کی حال اے کسان ویر، کیہڑا مسئلہ اے؟)
- عنوان لئی شروع وچ ## تے اہم لفظاں نوں **bold** کرو
زراعت ہیلپ لائن: 0800-15000 (مفت)`;
  }

  return `آپ DehatiAI ہیں — پنجاب کے کسانوں کا دوستانہ AI ساتھی۔
موجودہ موسم: ${season} | سال: ${year}
⚠️ اہم: آپ صرف زراعت، فصلوں، جانوروں، مٹی، موسم اور دیہی پاکستان سے متعلق سوالات کا جواب دیں گے۔ کوئی بھی غیر زرعی سوال آنے پر صرف کہیں: "معذرت، میں صرف زرعی موضوعات پر بات کر سکتا ہوں۔ فصل، کھاد، بیماری، آبپاشی، جانور یا اسکیموں سے متعلق پوچھیں۔"

انداز: بالکل WhatsApp پر کسی قریبی دوست کی طرح — سادہ، دوستانہ، مختصر (3-5 جملے)
- جواب آسان، عام فہم اردو میں دیں
- 1-2 مختصر بلٹ پوائنٹس (-) یا پیراگراف کا استعمال کریں
- عنوان کے لیے شروع میں ## اور اہم الفاظ کو **bold** کریں
- عنوان یا جملے کے آخر میں ## یا - نہ لگائیں
- زراعت ہیلپ لائن: 0800-15000 (مفت)`;
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

// ——— POST /api/ai/ask ——————————————————————————————————————————————————
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
    if (cached) {
      // Still log cached hits so admin can see what farmers are asking
      db.saveChatLog({
        userId:    req.user?.id    || null,
        userName:  req.user?.name  || null,
        userPhone: req.user?.phone || null,
        question:  q,
        answer:    cached,
        language
      }).catch(() => {});
      return res.json({ answer: cached, fromCache: true });
    }

    const text = await claudeAsk(q, buildChatSystem(language), 700, 0.6);

    // M4 fix: Save to cache for future requests
    if (text) aiCache.set(q, language, text);

    // Save to chat_logs so it appears in admin Questions tab
    if (text) {
      db.saveChatLog({
        userId:    req.user?.id    || null,
        userName:  req.user?.name  || null,
        userPhone: req.user?.phone || null,
        question:  q,
        answer:    text,
        language
      }).catch(() => {});
    }

    res.json({ answer: text });
  } catch (err) {
    console.error('AI ask error:', err.message);
    res.status(500).json({ error: 'AI جواب دینے میں ناکام — دوبارہ کوشش کریں' });
  }
});

// Load ResNet50 PyTorch Model Inference & Agronomy Engine
const modelInference = require('../lib/modelInference');
let agronomyDb = {};
let diseaseClasses = {};
try {
  agronomyDb = require('../lib/agronomyDatabase.json');
  diseaseClasses = require('../lib/diseaseClasses.json');
  console.log(`✅ Loaded ResNet50 Model Inference, Agronomy DB (${Object.keys(agronomyDb).length} remedies) & Disease Index (${Object.keys(diseaseClasses).length} classes)`);
} catch (err) {
  console.warn('⚠️ Agronomy DB or Disease Classes failed to load:', err.message);
}

// GET /api/ai/disease-catalog — Returns complete 306-class disease index enriched with Pak Agronomy remedies
router.get('/disease-catalog', (req, res) => {
  try {
    const catalog = Object.entries(diseaseClasses).map(([id, nameEn]) => {
      const key = nameEn.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
      const detail = agronomyDb[key] || agronomyDb[Object.keys(agronomyDb).find(k => key.includes(k) || k.includes(key))] || null;

      return {
        id: parseInt(id, 10),
        name_en: detail ? detail.name_en : nameEn.replace(/\b\w/g, l => l.toUpperCase()),
        name_ur: detail ? detail.name_ur : nameEn,
        key: key,
        has_local_remedy: !!detail,
        model_name: 'ResNet50 PyTorch Model (306 Classes)',
        detail: detail || {
          name_ur: nameEn,
          name_en: nameEn,
          treatment_summary: 'بیماری کی ابتدائی علامات پر مقامی زرعی افسر یا ماہر سے مشورہ کریں اور مناسب پھپھوندی کش دوائی کا سپرے کریں۔',
          withholding_period_days: 14,
          organic_alternative: 'دیسی علاج: نیم کا تیل 5 ملی لیٹر فی لیٹر پانی میں ملا کر احتیاطی سپرے کریں۔',
          medicines: [
            {
              brand: 'Indofil M-45 / Antracol',
              active: 'Mancozeb 80% / Propineb 70%',
              dosage: '600-800 گرام فی ایکڑ',
              method: 'سپرے',
              withholding_period_days: 14,
              suppliers: ['Indofil', 'Bayer'],
              estimated_price_pkr: 'Rs. 950 - 1,400'
            }
          ],
          prevention: 'کھیت صاف رکھیں، متوازن کھاد دیں اور پانی کی نکاسی کا مناسب انتظام رکھیں۔'
        }
      };
    });

    res.json({ total: catalog.length, catalog, model: 'ResNet50-Plant-model-80.pth' });
  } catch (err) {
    console.error('Catalog error:', err.message);
    res.status(500).json({ error: 'ڈائریکٹری حاصل کرنے میں ناکامی' });
  }
});

router.post('/disease', diseaseLimiter, optionalAuth, async (req, res) => {
  try {
    const { imageBase64, cropName, diseaseKey, mimeType = 'image/jpeg' } = req.body;

    if (imageBase64 && Buffer.byteLength(imageBase64, 'base64') > 5 * 1024 * 1024) {
      return res.status(413).json({ error: 'تصویر کا سائز 5MB سے زیادہ نہیں ہونا چاہیے۔' });
    }

    // ── Step 1: Check database or require AI analysis ─────────
    const tier1 = modelInference.predictDisease(imageBase64, cropName, diseaseKey);

    console.log(
      `[Scanner] Result → "${tier1.disease_en}" | ` +
      `Source: ${tier1.source} | ` +
      `Local DB: ${tier1.hasLocalRecord ? '✓ Match' : '✗ Unknown'}`
    );

    // ══════════════════════════════════════════════════════════════════════════
    // TIER 1: LOCAL DATABASE OR CATALOG MATCH
    // ══════════════════════════════════════════════════════════════════════════
    if ((tier1.source === 'database_match' && tier1.hasLocalRecord) || (diseaseKey && !imageBase64)) {
      console.log(`[Tier-1 ✅ CATALOG/LOCAL MATCH] ${tier1.localKey || diseaseKey} → ${tier1.disease_en}`);
      return res.json({
        tier:                    1,
        source:                  'database_match',
        source_label:            tier1.model_attribution || '📖 ڈائریکٹری سے منتخب کردہ ریکارڈ',
        model_attribution:       tier1.model_attribution || 'ResNet50 / agronomyDatabase',
        disease_ur:              tier1.disease_ur || cropName || 'زرعی بیماری',
        disease_en:              tier1.disease_en || diseaseKey || 'Crop Disease',
        disease:                 tier1.disease || `${tier1.disease_ur || 'بیماری'} (${tier1.disease_en || ''})`,
        cause:                   tier1.cause || 'پھپھوندی / کیڑا (Pathogen)',
        treatment:               tier1.treatment || 'مناسب پھپھوندی کش یا دافع حشرات دوائی کا سپرے کریں۔',
        prevention:              tier1.prevention || 'کھیت صاف رکھیں، متوازن کھاد دیں اور پانی کی نکاسی کا انتظام رکھیں۔',
        withholding_period_days: tier1.withholding_period_days || 14,
        organic_alternative:     tier1.organic_alternative || 'دیسی علاج: نیم کا تیل 5 ملی لیٹر فی لیٹر پانی میں ملا کر احتیاطی سپرے کریں۔',
        medicines:               tier1.medicines || [],
        disclaimer:              'استعمال سے پہلے مقامی زرعی افسر سے تصدیق کروائیں۔'
      });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // TIER 2: CLOUD VISION AI
    // ══════════════════════════════════════════════════════════════════════════
    if (tier1.source === 'requires_ai_analysis' && imageBase64 && claude) {
      console.log(
        `[Tier-2 🤖 CLOUD VISION] Requires AI analysis — delegating to Claude Vision AI`
      );

      const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      const safeMime     = ALLOWED_MIME.includes(mimeType) ? mimeType : 'image/jpeg';
      const month        = new Date().getMonth() + 1;
      const season       = (month >= 5 && month <= 10) ? 'خریف (Kharif)' : 'ربیع (Rabi)';
      const cropText     = cropName
        ? `Crop specified by farmer: ${cropName}\n`
        : 'Crop: unspecified — identify crop from leaf visual\n';

      const samplePakistaniMeds =
        'Tilt 250EC, Nativo 75WG, Amistar Top, Ridomil Gold MZ 68WG, ' +
        'Confidor 200SL, Bavistin, Indofil M-45, Cuprocaffaro, ' +
        'Folicur 250EW, Score 250EC, Daconil, Antracol 70WP, ' +
        'Kumulus DF, Beam 75WP, Acrobat MZ, Curzate M8';

      const systemPrompt =
`You are Dr. Zara — senior plant pathologist with 20+ years in Punjab & Sindh Pakistan.
Diagnose the crop disease from the leaf image and prescribe localized Pakistani remedies.

CRITICAL PRODUCT DATABASE:
Always use Pakistani registered brands: ${samplePakistaniMeds}.
Include PKR price estimates (Rs.) and withholding/pre-harvest interval (PHI) days.

Respond strictly in valid JSON:
{
  "disease_ur": "بیان کردہ بیماری کا اردو نام",
  "disease_en": "English Disease Name",
  "cause": "پھپھوندی / بیکٹیریا / کیڑا (Pathogen/Cause)",
  "treatment": "علاج کا خلاصہ اور سپرے کا طریقہ",
  "prevention": "آئندہ فصل کے لیے احتیاطی تدابیر",
  "withholding_period_days": 14,
  "organic_alternative": "دیسی علاج: نیم کا تیل 5 ملی لیٹر فی لیٹر پانی يا لکڑی کی راکھ",
  "medicines": [
    {
      "brand": "Nativo 75WG",
      "active": "Tebuconazole 50% + Trifloxystrobin 25%",
      "dosage": "80 گرام فی ایکڑ",
      "method": "سپرے",
      "withholding_period_days": 30,
      "suppliers": ["Bayer"],
      "estimated_price_pkr": "Rs. 1,800 - 2,300"
    }
  ]
}`;

      const promptText = `Season: ${season}\n${cropText}\nAnalyze this leaf image. Provide precise diagnosis and Pakistani agronomy prescription in the JSON format above.`;

      try {
        const response = await claude.messages.create({
          model:      CLAUDE_MODEL_VIS,
          max_tokens: 900,
          system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: safeMime, data: imageBase64 } },
              { type: 'text',  text: promptText }
            ]
          }]
        });

        const rawText = response.content?.[0]?.text ?? '';
        let parsed    = null;
        try {
          const m = rawText.match(/\{[\s\S]*\}/);
          if (m) parsed = JSON.parse(m[0]);
        } catch (_) {}

        if (parsed && parsed.disease_ur) {
          // ── Active Learning Auto-Cache ──────────────────────────────────────
          // Save AI result to agronomyDatabase.json — next time same disease
          // appears it will be served from Tier-1 with zero Cloud cost.
          const aiKey = (parsed.disease_en || tier1.disease_en || '')
            .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
          modelInference.saveToAgronomyDb(aiKey, parsed);

          console.log(`[Tier-2 ✅ CLOUD SUCCESS] "${parsed.disease_en}" — cached to agronomyDatabase.json`);
          return res.json({
            tier:                    2,
            source:                  'ai_vision',
            source_label:            '🤖 AI وژن تجزیہ ضروری',
            model_attribution:       '🤖 AI وژن تجزیہ ضروری',
            disease:                 `${parsed.disease_ur} (${parsed.disease_en || ''})`,
            disease_ur:              parsed.disease_ur,
            disease_en:              parsed.disease_en || '',
            cause:                   parsed.cause                || 'پھپھوندی / پاتھوجن',
            treatment:               parsed.treatment            || 'مناسب پھپھوندی کش دوائی کا سپرے کریں۔',
            prevention:              parsed.prevention           || 'کھیت صاف رکھیں اور متوازن کھاد دیں۔',
            withholding_period_days: parsed.withholding_period_days || 14,
            organic_alternative:     parsed.organic_alternative  || 'دیسی علاج: نیم کا تیل 5 ملی لیٹر فی لیٹر پانی میں ملا کر احتیاطی سپرے کریں۔',
            medicines:               parsed.medicines             || [],
            disclaimer:              'استعمال سے پہلے مقامی زرعی افسر سے تصدیق کروائیں۔'
          });
        }
      } catch (aiErr) {
        console.warn('[Tier-2] Claude Vision error — falling to Tier-3 offline:', aiErr.message);
      }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // TIER 3: OFFLINE FALLBACK
    // Device is offline  OR  Claude unavailable  OR  Cloud call failed.
    // Serve best local ResNet50 estimate with prominent offline warning badge.
    // ══════════════════════════════════════════════════════════════════════════
    const offlineReason = !imageBase64
      ? 'No image provided'
      : !claude
        ? 'Cloud AI not configured'
        : 'Cloud AI unreachable';

    console.log(`[Tier-3 📱 OFFLINE] "${tier1.disease_en}" — ${offlineReason}`);
    res.json({
      tier:                    3,
      source:                  'offline_fallback',
      source_label:            '📱 آف لائن موڈ: اندازاً تجویز (تصدیق کریں)',
      model_attribution:       tier1.model_attribution,
      disease:                 tier1.disease,
      disease_ur:              tier1.disease_ur,
      disease_en:              tier1.disease_en,
      cause:                   tier1.cause,
      treatment:               tier1.treatment,
      prevention:              tier1.prevention,
      withholding_period_days: tier1.withholding_period_days,
      organic_alternative:     tier1.organic_alternative,
      medicines:               tier1.medicines,
      disclaimer:              'استعمال سے پہلے مقامی زرعی افسر سے تصدیق کروائیں۔'
    });

  } catch (err) {
    console.error('[Disease endpoint] Critical error:', err.message);
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

    // Log to Questions tab: prefix with tool name so admin knows which page
    if (text) {
      db.saveChatLog({
        userId:    req.user?.id    || null,
        userName:  req.user?.name  || null,
        userPhone: req.user?.phone || null,
        question:  `[کھاد] فصل: ${crop || 'نامعلوم'} | مٹی: ${soilType || 'عام'} | عمر: ${cropAge || 'نامعلوم'}`,
        answer:    text,
        language:  'ur'
      }).catch(() => {});
    }

    res.json({ answer: text });
  } catch (err) {
    console.error('Fertilizer error:', err.message);
    res.status(500).json({ error: 'جواب دینے میں ناکام' });
  }
});

// ─── POST /api/ai/chat/stream (SSE streaming) ───────────────────────────────
router.post('/chat/stream', aiLimiter, optionalAuth, async (req, res) => {
  let heartbeat;
  try {
    let { messages, question, language = 'ur' } = req.body;

    // Accept both payload shapes: { messages: [...] } OR { question: '...', language: '...' }
    if ((!messages || !Array.isArray(messages) || messages.length === 0) && question) {
      messages = [{ role: 'user', content: question.trim() }];
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'پیغامات یا سوال ضروری ہے' });
    }

    const lastMsg = messages[messages.length - 1];

    if (!claude) {
      res.setHeader('Content-Type',  'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection',    'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders();
      res.write(`data: ${JSON.stringify({ text: '⚠️ AI سروس دستیاب نہیں' })}\n\n`);
      res.write('data: [DONE]\n\n');
      return res.end();
    }

    // Off-topic guard
    if (lastMsg.role === 'user' && !isAgricultureRelated(lastMsg.content)) {
      res.setHeader('Content-Type',  'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection',    'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders();
      res.write(`data: ${JSON.stringify({ text: OFF_TOPIC_UR })}\n\n`);
      res.write('data: [DONE]\n\n');
      return res.end();
    }

    // ——— Cache lookup before sending headers ———
    const userMessages = messages.filter(m => m.role === 'user');
    let cachedHit = null;
    if (lastMsg.role === 'user' && userMessages.length === 1) {
      const cacheTimeout = new Promise(resolve => setTimeout(() => resolve(null), 3000));
      cachedHit = await Promise.race([aiCache.get(lastMsg.content, language), cacheTimeout]);
    }

    // Set ALL headers (including X-Cache) BEFORE calling flushHeaders!
    res.setHeader('Content-Type',  'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection',    'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('X-Cache', cachedHit ? 'HIT' : 'MISS');
    res.flushHeaders();

    if (cachedHit) {
      // Stream cached answer in chunks (feels like live streaming)
      const chunkSize = 30;
      for (let i = 0; i < cachedHit.length; i += chunkSize) {
        res.write(`data: ${JSON.stringify({ text: cachedHit.slice(i, i + chunkSize) })}\n\n`);
        await new Promise(r => setTimeout(r, 8));
      }
      res.write('data: [DONE]\n\n');
      return res.end();
    }

    // Start heartbeat AFTER headers are flushed
    heartbeat = setInterval(() => { try { res.write(': ping\n\n'); } catch {} }, 8000);
    req.on('close', () => { clearInterval(heartbeat); });
    try {
      if (req.socket) {
        req.socket.setNoDelay(true);
        req.socket.setTimeout(0); // Disable socket timeout for active SSE stream
      }
    } catch {}

    // ——— Build Claude messages with last 10 turns (multi-turn context memory) ———
    const claudeMessages = messages
      .slice(-10)  // Limit to last 10 turns for cost efficiency
      .map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
      }));

    // ——— Extract farmer context from conversation history for memory breadcrumbs ———
    // Detect land size, crop type, district mentioned in any prior message
    const allText = messages.map(m => m.content || '').join(' ').toLowerCase();
    const contextClues = [];
    const acreMatch = allText.match(/(\d+(?:\.\d+)?)\s*(?:ایکڑ|acre|kanal|کنال)/i);
    if (acreMatch) contextClues.push(`زمین کا رقبہ: ${acreMatch[1]} ایکڑ`);
    const cropMatch = allText.match(/(?:فصل|crop)[:\s]+([ا-ے\w]+)/i);
    if (cropMatch) contextClues.push(`فصل: ${cropMatch[1]}`);
    const districtMatch = allText.match(/(?:ضلع|district)[:\s]+([ا-ے\w]+)/i);
    if (districtMatch) contextClues.push(`ضلع: ${districtMatch[1]}`);

    const contextBlock = contextClues.length > 0
      ? `\n\n🗂️ گفتگو میں ذکر شدہ کسان کی معلومات:\n${contextClues.map(c => `- ${c}`).join('\n')}\n(ان معلومات کو یاد رکھیں اور جواب میں استعمال کریں)`
      : '';

    const chatSystemText = buildChatSystem(language) + contextBlock;

    // Stream with Claude — ephemeral caching on system prompt reduces costs 90%
    let fullReply = '';
    const stream = claude.messages.stream({
      model: CLAUDE_MODEL,
      max_tokens: 500,
      temperature: 0.65,
      system: [{ type: 'text', text: chatSystemText, cache_control: { type: 'ephemeral' } }],
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
router.post('/animal', aiLimiter, optionalAuth, async (req, res) => {
  try {
    const { animalType, symptoms, question } = req.body;
    if (!animalType && !symptoms && !question)
      return res.status(400).json({ error: 'جانور کی قسم یا علامات ضروری ہیں' });
    if (!claude) return res.json({ answer: '⚠️ AI سروس دستیاب نہیں' });

    // Find relevant diseases from livestockDatabase for context alignment
    const allDiseases = [
      ...(livestockDb.cattle_buffalo || []),
      ...(livestockDb.goat_sheep || []),
      ...(livestockDb.poultry || [])
    ];
    
    const queryStr = `${animalType || ''} ${symptoms || ''} ${question || ''}`.toLowerCase();
    const matchedContext = allDiseases
      .filter(d => 
        queryStr.includes(d.disease_name.toLowerCase()) || 
        d.symptoms.split('،').some(s => queryStr.includes(s.trim().toLowerCase()))
      )
      .slice(0, 3)
      .map(d => `• بیماری: ${d.disease_name} | علامات: ${d.symptoms} | دوا/برانڈز: ${d.common_brands_pakistan} | بچاؤ/ویکسین: ${d.prevention_vaccine}`)
      .join('\n');

    const systemPrompt = `آپ پنجاب پاکستان کے تجربہ کار سینئر ویٹرنری فزیشن اور مویشی ماہر ہیں۔
سرکاری پاکستان ویٹرنری ڈائریکٹری (Punjab Livestock & DRAP) کا حوالہ حسبِ ذیل ہے:
${matchedContext || 'تمام ادویات DRAP پاکستان کی رجسٹرڈ لسٹ کے مطابق تجویز کریں۔'}

رہنمائی کی ہدایات:
1. ہمیشہ پاکستان میں دستیاب DRAP رجسٹرڈ برانڈز (مثلاً الفامائسن-ایل اے، ٹیرامائسن، اینروویٹ، بیرینل، میلونیکس، بیوٹالیکس، ماسٹیلیپ، لاسوٹا، ایچ ایس ویکسین) کی نشاندہی کریں۔
2. خوراک کے لیے ہمیشہ "ویٹرنری ڈاکٹر سے وزن کے حساب سے خوراک کی تصدیق" کا واضح مشورہ دیں۔
3. خونی بخار (HS)، منہ کھر (FMD)، اینتھریکس یا برڈ فلو جیسی خطرناک بیماری میں فوری حکومتی لائیو اسٹاک حکام کو اطلاع کی ہدایت کریں۔`;

    const prompt = `جانور کی قسم: ${animalType || 'نامعلوم'}
علامات: ${symptoms || 'نامعلوم'}
مزید تفصیلات: ${question || 'کوئی نہیں'}

پاکستانی جانوروں کے ڈاکٹر کی طرح درج ذیل 4 پوائنٹس میں جواب دیں:
1. 🩺 ممکنہ بیماری یا مسئلہ
2. 💊 گھر پر فوری علاج و DRAP رجسٹرڈ برانڈز
3. 🛡️ بچاؤ اور ویکسینیشن شیڈول
4. ⚠️ کیا فوری ویٹرنری ڈاکٹر ضروری ہے؟ (ہاں/نہیں اور وجہ)

مختصر، جامع اور آسان اردو زبان میں جواب دیں۔`;

    const text = await claudeAsk(prompt, systemPrompt, 700, 0.4);

    // Log to Questions tab: prefix with tool name
    if (text) {
      db.saveChatLog({
        userId:    req.user?.id    || null,
        userName:  req.user?.name  || null,
        userPhone: req.user?.phone || null,
        question:  `[جانور] ${animalType || 'نامعلوم'}: ${(symptoms || question || '').slice(0, 200)}`,
        answer:    text,
        language:  'ur'
      }).catch(() => {});
    }

    res.json({ answer: text });
  } catch (err) {
    console.error('Animal error:', err.message);
    res.status(500).json({ error: 'جواب دینے میں ناکام' });
  }
});

// ─── GET /api/ai/history (User Chat History Persistence) ───────────────────
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const history = await db.getUserChatHistory(req.user.id);
    res.json({ history });
  } catch (err) {
    console.error('History error:', err.message);
    res.status(500).json({ error: 'ہسٹری لوڈ نہیں ہو سکی' });
  }
});

module.exports = router;
