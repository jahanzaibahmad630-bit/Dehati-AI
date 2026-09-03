const express   = require('express');
const Anthropic  = require('@anthropic-ai/sdk');
const { GoogleGenAI } = require('@google/genai');
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
  console.log('✅ Claude API configured — Disease Vision ONLY: claude-sonnet-4-5');
} else {
  console.warn('⚠️  CLAUDE_API_KEY not set — AI features disabled');
}

// claude-sonnet-4-5 = Claude Sonnet 4.x (platform.claude.com enterprise)
const CLAUDE_MODEL     = 'claude-sonnet-4-5';
const CLAUDE_MODEL_VIS = 'claude-sonnet-4-5'; // supports vision

// ─── Gemini Client (Chat, Ask, Fertilizer, Animal — ALL text endpoints) ───────
let gemini = null;
if (process.env.GEMINI_API_KEY) {
  gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  console.log('✅ Gemini API configured — Primary text engine: gemini-2.0-flash');
} else {
  console.warn('⚠️  GEMINI_API_KEY not set — Falling back to Claude for text endpoints');
}
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash'; // primary text engine


// ————————————————————————————————————————————————————————————————————————————————
// Urdu script keywords
const AGRI_KEYWORDS_UR = [
  // فصلیں
  'فصل','گندم','چاول','مکئی','کپاس','گنا','آلو','ٹماٹر','پیاز','مرچ','لہسن','سرسوں',
  'چنا','مسور','مونگ','ماش','جوار','باجرہ','تل','السی','کماد','دھان','مٹر','تارا میرہ',
  'موٹھ','گوار','سویابین','سورج مکھی','زیتون','انار','آم','کینو','مالٹا','امرود',
  // سبزیاں و چارہ
  'برسیم','لوسرن','جنتر','روڑی','گوبر','بھنڈی','بینگن','کریلا','کدو','کھیرا','تربوز',
  'خربوزہ','پالک','مولی','گاجر','شلجم','بند گوبھی','پھول گوبھی','چقندر','مونگ پھلی',
  // انپٹ
  'کھاد','DAP','یوریا','پوٹاش','نائٹروجن','فاسفورس','سپرے','زہر','دوائی',
  'بیج','پنیری','ٹیکہ','ٹیکے',
  // کیڑے و بیماری
  'بیماری','کیڑا','سنڈی','تیلا','چیپا','دیمک','پھپھوندی','زنگ','جھلساؤ','کٹوا',
  'سفید مکھی','تھرپس','مکڑی','شائنر','گلابی سنڈی','لشکری سنڈی',
  // زمین، رقبہ و پیمائش
  'آبپاشی','پانی','مٹی','زمین','نمی','سیم','تھور','نہر','کھال','نلکی','ڈرپ',
  'ٹیوب ویل','موٹر','پمپ','بارش','اولے','سیلاب','خشک سالی','مرلہ','کنال','ایکڑ',
  'مربع','پٹواری','فرد','خسرہ','انتقال','پیمائش','ٹھیکہ','رقبہ','وارابندی',
  // عملیات و مشینری
  'بوائی','کٹائی','گوڈی','روٹاویٹر','ہل','ٹریکٹر','تھریشر','کمبائن','کاشت',
  'ڈیزل','پیٹرول','موبل آئل','فلٹر','بیٹری','بور','پیٹر','سولر پینل',
  // منڈی
  'منڈی','قیمت','ریٹ','فروخت','خریداری','آڑھتی','اناج','ذخیرہ',
  // جانور، مویشی، مرغی و ویٹرنری
  'گائے','بھینس','بکری','مرغی','جانور','دودھ','چارہ','مویشی','بیل','اونٹ',
  'خرگوش','مچھلی','جھینگا','مرغا','کٹڑا','کٹڑی','بچھڑا','لےلا','ہانڈی',
  'رانی کھیت','گمبورو','کوکسی','منہ کھر','گل گھوٹو','چمچڑی','چچڑی','اپھارہ',
  'سرہ','تھن','مستائیٹس','ہوانہ','تخم کاری','مستی','حمل','ویٹرنری',
  // عمومی
  'زراعت','کسان','کھیت','فارم','باغ','پھل','سبزی','موسم','درجہ حرارت',
  'کسان کارڈ','ZTBL','فصلی بیمہ','زرعی','ہرے چارے','قرضہ','سبسڈی','اسکیم',
  'محکمہ زراعت','زرعی ترقیاتی','ایگری',
  // پنجابی و سرائیکی زرعی الفاظ (Punjabi & Saraiki)
  'کݨک','پھٹی','کپاہ','مہی','مجھ','جھوٹا','چھیلہ','چھترا','پاݨی','کھوہ','ٻکرا','چݨائی',
  'کݙاں','کݙݨ','کیویں','پیلھی','پیلھیاں','سارنگ','سنگی','بھرا','ویر','وائی','بیائی','لائی'
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
  // Politics (not agri-related - strictly full words/phrases, NEVER short substrings like 'pm')
  'election','vote','imran khan','nawaz','zardari','party politics','prime minister','wazir e azam','pmln','pti',
  // Tech (not agri-related)
  'laptop','computer','software','coding','programming','bitcoin','crypto',
  // Love/Personal
  'love','pyaar','ishq','larki','larka','shaddi','rishta','divorce',
  // Human Medical (non-veterinary)
  'human doctor','hospital for humans','medicine for human','aspirin for human',
  // Other clearly off-topic
  'cooking recipe','khana pakana','hotel booking','tourism','travel abroad'
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

function offTopicMessage(language) {
  if (language === 'pa' || language === 'pj') {
    return `معذرت ویر! 🌾 میں DehatiAI آں — صرف زراعت، فصلاں، ڈنگراں تے زمینداری دے سوالاں دا جواب دے سکدا واں۔

مہربانی کر کے ایہناں موضوعات بارے پچھو:
• فصلاں دیاں بیماریاں تے علاج
• کھاد تے سپرے دا مشورہ
• آبپاشی تے موسم
• منڈی دیاں اج دیاں قیمتاں
• مال ڈنگر دی صحت
• سرکاری زرعی سکیماں`;
  }
  if (language === 'skr' || language === 'saraiki') {
    return `معذرت بھرا! 🌾 میں DehatiAI ہاں — صرف کھیتی باڑی، فصلاں، مال ڈنگر تے زمینداری بارے ڳالھ کر سڳدا ہاں۔

مہربانی کر تے ایہناں موضوعات بارے پچھو:
• فصلاں دیاں بیماریاں تے علاج
• کھاد تے سپرے دا مشورہ
• آبپاشی تے موسم دا حال
• منڈی دے اجوکے بھا (ریٹ)
• مال ڈنگر دی صحت تے علاج
• سرکاری کسان سکیماں`;
  }
  if (language === 'en') {
    return `Sorry! 🌾 I am DehatiAI — I can only answer questions related to agriculture, crops, livestock, and farming in Pakistan.

Please ask about:
• Crop diseases & remedies
• Fertilizer & spray schedule
• Irrigation & weather forecast
• Mandi prices
• Animal health & veterinary
• Government agriculture schemes`;
  }
  return OFF_TOPIC_UR;
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

  return `آپ DehatiAI ہیں — پنجاب، پاکستان کے کسانوں کا سرکاری تحقیق پر مبنی AI مددگار۔
آپ کے تمام جوابات مندرجہ ذیل سرکاری اداروں کی تحقیق پر مبنی ہیں:
1. ایوب زرعی تحقیقاتی ادارہ (AARI) فیصل آباد — فصل کیلنڈر، اقسام، کیڑے مار ادویات
2. ادارہ تحقیقات برائے زرخیزی زمین پنجاب (SFRI) لاہور — کھاد فارمولے، مٹی درستگی
3. ڈرگ ریگولیٹری اتھارٹی پاکستان (DRAP) — ویٹرنری ادویات، PHI وقت
4. محکمہ آفات نباتات و مالیاتی معیار کیڑے مار ادویات پنجاب — سپرے کی مصدقہ مقداریں
5. قومی زرعی تحقیقاتی مرکز (NARC) اسلام آباد — اعلیٰ قدر فصلیں (لہسن G1، مورنگا)
آج: ${dateStr} (${timeOfDay})
موجودہ زرعی موسم: ${season}
مقام: پنجاب، پاکستان

📚 UAF & NARC سائنسی تحقیقاتی بنیاد (RAG Knowledge Engine):
جب فصل کی قسم، مٹی کی اصلاح، یا کیڑے مار ادویات پوچھی جائیں تو درج ذیل مصدقہ ریسرچ ڈیٹا استعمال کریں:
- گندم اقسام (کلراٹھی/سیم مٹی): اکبر-19، دلکش-20، سبحانی-21، عروج-22، فخرِ بھکر — AARI فیصل آباد (بوائی کا بہترین وقت: 1 تا 20 نومبر)
- کپاس اقسام (گرمی، سفید مکھی و گلابی سنڈی مزاحم): FH-416 (جدید ورائٹی 2026)، CKC-1، FH-333 — AARI و پنجاب پیسٹ وارننگ ایڈوائزری
- روغنی اجناس (کم پانی): TS-5 تل، Super Canola کینولا — NARC Islamabad Oilseeds Division
- اعلیٰ منافع بخش باغات و فصلیں: NARC G1 گارلک (لہسن) — 150-200 من فی ایکڑ | مورنگا (سوہانجنا)
- سیم و تھور مٹی اصلاح: جپسم 80-mesh 400 کلو فی ایکڑ (pH > 8.5) — UAF Agronomy Dept Protocol
- کھاد تازہ مارکیٹ اوسط (2026): یوریا ₨4,300–4,800 فی بوری (اوسط ₨4,400) | DAP ₨10,000–10,200 فی بوری
- DRAP رجسٹرڈ کیڑے مار ادویات: Nativo 75WG (Bayer)، Ridomil Gold (Syngenta)، Confidor 200SL (Bayer)، Indofil M-45 (Ali Akbar Group)، Coragen 18.5SC (FMC)، Regent 50SC (BASF)
- ⚠️ پری ہارویسٹ انٹروال (PHI) لازمی بتائیں: ہر کیڑے مار دوائی کا پھل/فصل کٹائی سے پہلے کا ممنوع عرصہ بتانا ضروری ہے (مثلاً: Nativo — 7 دن، Confidor — 14 دن)
- ویٹرنری ادویات و ویکسینیشن: منہ کھر (FMD) ہر 6 ماہ بعد، لمپی سکن (LSD) سالانہ، گل گھوٹو (HS) قبل از مون سون (UVAS/VRI پروٹوکول)
- دودھ کا ممنوع عرصہ (Milk Withdrawal): اینٹی بائیوٹک استعمال کے بعد 72 گھنٹے دودھ نہ بیچیں
- گوشت کا ممنوع عرصہ (Meat Withdrawal): 14-28 دن علاج کے بعد ذبح نہ کریں
جواب کے آخر میں یہ سائنسی حوالہ شامل کریں جب متعلقہ ہو: 📚 ماخذ: زرعی یونیورسٹی فیصل آباد (UAF) / AARI / AMIS پنجاب

📊 منڈی لائیو قیمتیں و مالیاتی فیصلوں کا انجن (AMIS Punjab Mandi Verified 2026):
پنجاب کی غلہ منڈیوں کے تازہ ترین اوسط ریٹ:
- ملتان (Multan): گندم ₨3,490–4,360/40کلو | کپاس ₨8,600–10,750/40کلو | چاول باسمتی ₨12,100–16,300/40کلو | مکئی ₨3,550–4,260/40کلو
- فیصل آباد (Faisalabad): گندم ₨4,700–5,800/40کلو | کپاس ₨8,700–10,875/40کلو | گنا ₨440–550/40کلو (سرکاری بنیادی ریٹ ₨450)
- رحیم یار خان (Rahim Yar Khan): کپاس ₨8,750–10,900/40کلو | گندم ₨3,475–4,340/40کلو
- ڈیرہ غازی خان (DG Khan): کپاس ₨10,750–13,400/40کلو | گندم ₨3,750–4,680/40کلو | چاول ₨13,500–18,200/40کلو
- سرگودھا / اوکاڑہ: چاول باسمتی ₨11,900–16,000/40کلو | کنو ₨2,200/100عدد

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
- غیر یقینی ہو تو: ہمیشہ مقامی زرعی افسر (Extension Officer) سے ملنے کا مشورہ دیں اور 0800-17000 (زراعت) یا 0800-15000 (لائیوسٹاک) ہیلپ لائن بتائیں
- ⚠️ کیمیائی خوراک کے بارے میں کبھی بھی تخمینہ یا اندازہ مت لگائیں — صرف SFRI/AARI/DRAP سے مصدقہ مقداریں بتائیں
- ہر جواب کے آخر میں متعلقہ سرکاری ماخذ بتائیں (مثلاً: 📚 ماخذ: AARI فیصل آباد)
- اگر کوئی فصل یا بیماری آپ کے علم میں نہیں تو صراحت کریں: "اس کے بارے میں مصدقہ معلومات دستیاب نہیں — مقامی زرعی افسر سے رابطہ کریں"
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
    return `تسی DehatiAI او — پنجاب دے کساناں دے مخلص تے ماہر زرعی مددگار۔
موجودہ موسم: ${season} | سال: ${year}
⚠️ اہم: تسی صرف زراعت، فصلاں (کݨک، کپاہ، کماد، چاول)، ڈنگراں (مجھ، گاں، بکری)، کھاد، بیماریاں، آبپاشی، تے منڈی ریٹاں توں متعلق سوالاں دا جواب دیو گے۔ کسے بھی غیر زرعی سوال لئی صرف آکھو: "معذرت، میں صرف زرعی سوالاں دا جواب دے سکدا واں۔"

زبان و انداز:
- تمام جواب خالص شاہ مکھی پنجابی (Shahmukhi Punjabi) وچ دیو۔
- سادہ، دوستانہ، تے مختصر جواب (3-5 جملے۔ مثال: کی حال اے کسان ویر، کیہڑا مسئلہ اے؟ کݨک نوں پانی کدووں لانا اے)
- عنوان لئی شروع وچ ## تے اہم لفظاں نوں **bold** کرو
زراعت ہیلپ لائن: 0800-15000 (مفت)`;
  }

  if (language === 'skr' || language === 'saraiki') {
    return `تساں DehatiAI او — وسیب تے جنوبی پنجاب (ملتان، بہاولپور، ڈیرہ غازی خان، رحیم یار خان، مظفر گڑھ، لیہ، لودھراں) دے کساناں دے مخلص زرعی ماہر تے سنگی۔
موجودہ موسم: ${season} | سال: ${year}
⚠️ اہم: تساں صرف زراعت، فصلاں (کݨک، کپاہ/پھٹی، کماد، چاول، تل، مکئی)، مال ڈنگر (ڳاں، مہی/مجھ، ٻکری، چھیلہ)، کھاد، بیماریاں، آبپاشی، نہری وارابندی تے منڈی دے بھا (ریٹ) بارے ڳالھ کریسو۔
کوئی وی غیر زرعی سوال آوݨ تے صرف اکھسو: "معذرت، میں صرف زراعت تے مال ڈنگر بارے ڳالھ کر سڳدا ہاں۔ فصل، کھاد، بیماری یا جانوراں بارے پچھو۔"

زبان و لہجہ:
- پورا جواب خالص، مٹھی تے ٹھیٹھ سرائیکی (Saraiki) وچ ݙیوو۔ (مثال: کیویں او بھرا، کیڑھی فصل بارے پچھݨا اے؟)
- سرائیکی زرعی الفاظ استعمال کرو: کݨک (گندم)، پھٹی/کپاہ (کپاس)، مہی/مجھ (بھینس)، ٻکرا، پاݨی ݙیوݨ، چݨائی، کݙاں (کب)، کینجھا (کیسا)، بھا (ریٹ)۔
- انداز دوستانہ، سدھا تے 3-5 جملیاں وچ مختصر ہووے۔
- عنوان لئی شروع وچ ## تے اہم لفظاں کوں **bold** کرو۔
ہیلپ لائن: 0800-15000 (مفت)`;
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
  const textBlock = response.content?.find(b => b.type === 'text');
  let text = textBlock?.text ?? response.content?.[0]?.text ?? '';
  text = text.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').trim();
  text = text.replace(/^[ \t]*Heading starts with[^\n]*\n+/i, '').trim();
  return text;
}

// ─── Gemini Ask Helper (primary text engine — all non-vision endpoints) ────────
async function geminiAsk(prompt, systemPrompt, maxTokens = 700) {
  const sysText = systemPrompt || buildFarmingSystem();
  if (!gemini) {
    // No Gemini configured — fall back to Claude
    if (claude) return claudeAsk(prompt, systemPrompt, maxTokens);
    return '';
  }
  try {
    const response = await gemini.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        systemInstruction: sysText,
        maxOutputTokens: maxTokens,
        temperature: 0.6
      }
    });
    const text = response.text || '';
    db.logAIUsage({
      endpoint: 'gemini_ask',
      tokensIn:  response.usageMetadata?.promptTokenCount || 0,
      tokensOut: response.usageMetadata?.candidatesTokenCount || 0,
      cacheTokens: 0
    }).catch(() => {});
    return text;
  } catch (geminiErr) {
    console.warn('[Gemini] Error — falling back to Claude:', geminiErr.message);
    if (claude) return claudeAsk(prompt, systemPrompt, maxTokens);
    return '';
  }
}

// ——— POST /api/ai/ask ——————————————————————————————————————————————————
router.post('/ask', aiLimiter, optionalAuth, async (req, res) => {
  try {
    const { question, language = 'ur' } = req.body;
    if (!question?.trim()) return res.status(400).json({ error: 'سوال خالی نہیں ہونا چاہیے' });
    if (!gemini && !claude) return res.json(aiUnavailable());

    const q = question.trim().slice(0, 1000); // safety length cap

    // If client sends soil profile, prepend it to the question for personalized AI response
    const soilBlock = (() => {
      try {
        const sp = req.body.soilProfile;
        if (!sp) return '';
        const parts = [];
        if (sp.ph)  parts.push('pH: ' + sp.ph);
        if (sp.ec)  parts.push('EC: ' + sp.ec + ' dS/m');
        if (sp.n)   parts.push('N: ' + sp.n + ' kg/acre');
        if (sp.p)   parts.push('P: ' + sp.p + ' kg/acre');
        if (sp.k)   parts.push('K: ' + sp.k + ' kg/acre');
        if (sp.zn)  parts.push('Zn: ' + sp.zn + ' ppm');
        return parts.length ? '[کسان مٹی رپورٹ: ' + parts.join(' | ') + ']\n' : '';
      } catch { return ''; }
    })();
    const qWithSoil = soilBlock ? soilBlock + q : q;

    // Fast keyword guard
    if (!isAgricultureRelated(q)) {
      return res.json({ answer: offTopicMessage(language), offTopic: true });
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

    const text = await geminiAsk(qWithSoil, buildChatSystem(language), 700);

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

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/ai/soil-scan  — Scan soil test report image and extract values
// Uses Claude vision (same model as disease detection) to read lab report OCR
// ──────────────────────────────────────────────────────────────────────────────
router.post('/soil-scan', diseaseLimiter, optionalAuth, async (req, res) => {
  try {
    if (!claude) return res.status(503).json({ error: 'Vision AI دستیاب نہیں — CLAUDE_API_KEY ترتیب دیں' });

    const { imageBase64, mimeType = 'image/jpeg' } = req.body;
    if (!imageBase64) return res.status(400).json({ error: 'تصویر نہیں ملی' });

    const VALID_MIMES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    const safeMime = VALID_MIMES.includes(mimeType) ? mimeType : 'image/jpeg';

    if (Buffer.byteLength(imageBase64, 'base64') > 5 * 1024 * 1024) {
      return res.status(413).json({ error: 'تصویر 5MB سے چھوٹی ہونی چاہیے' });
    }

    const systemPrompt = `You are an expert agricultural soil lab report reader for Pakistan (SFRI Punjab standards).
Your ONLY job is to extract numerical values from a soil test / soil health card image and return them as a strict JSON object.

Pakistani soil test reports (SFRI / Model Agri Mall / NARC labs) typically show these parameters:
- pH (soil reaction, usually 6.0–9.0 in Pakistan)
- EC (Electrical Conductivity, in mS/cm or dS/m, same unit)
- Organic Matter / OM (%, or sometimes shown as Organic Carbon — convert: OM = OC × 1.724)
- Nitrogen / N (% or ppm — if ppm, divide by 10000 to get %)
- Phosphorus / P (ppm or mg/kg)
- Potassium / K (ppm or mg/kg)
- Zinc / Zn (ppm or mg/kg)

Return ONLY this JSON, no extra text:
{
  "pH": <number or null>,
  "ec": <number or null>,
  "om": <number or null>,
  "n": <number or null>,
  "p": <number or null>,
  "k": <number or null>,
  "zn": <number or null>,
  "lab_name": "<lab/institution name from report if visible, else null>",
  "report_date": "<date from report if visible, else null>",
  "confidence": "<high|medium|low — how confident you are the image is a soil test report>",
  "notes": "<any important notes or warnings about the extraction, in Urdu if possible>"
}

If the image is NOT a soil test report (e.g. it's a selfie, landscape, etc.), return:
{ "error": "یہ مٹی ٹیسٹ رپورٹ نہیں ہے — مٹی ٹیسٹ کارڈ یا لیب رپورٹ کی تصویر لیں" }`;

    const response = await claude.messages.create({
      model: CLAUDE_MODEL_VIS,
      max_tokens: 600,
      system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: safeMime, data: imageBase64 } },
          { type: 'text',  text: 'اس مٹی ٹیسٹ رپورٹ سے تمام قدریں نکالیں اور JSON دیں۔' }
        ]
      }]
    });

    const rawText = response.content?.[0]?.text ?? '';
    let parsed = null;
    try {
      const m = rawText.match(/\{[\s\S]*\}/);
      if (m) parsed = JSON.parse(m[0]);
    } catch (_) {}

    if (!parsed) {
      return res.status(422).json({ error: 'رپورٹ پڑھنے میں ناکامی — واضح روشنی میں دوبارہ تصویر لیں' });
    }

    if (parsed.error) {
      return res.status(422).json({ error: parsed.error });
    }

    console.log(`[SoilScan] Extracted → pH:${parsed.pH} EC:${parsed.ec} OM:${parsed.om} N:${parsed.n} P:${parsed.p} K:${parsed.k} Zn:${parsed.zn} | Confidence: ${parsed.confidence}`);

    res.json({
      success: true,
      data: {
        pH:   parsed.pH   !== null && parsed.pH   !== undefined ? String(parsed.pH)   : '',
        ec:   parsed.ec   !== null && parsed.ec   !== undefined ? String(parsed.ec)   : '',
        om:   parsed.om   !== null && parsed.om   !== undefined ? String(parsed.om)   : '',
        n:    parsed.n    !== null && parsed.n    !== undefined ? String(parsed.n)    : '',
        p:    parsed.p    !== null && parsed.p    !== undefined ? String(parsed.p)    : '',
        k:    parsed.k    !== null && parsed.k    !== undefined ? String(parsed.k)    : '',
        zn:   parsed.zn   !== null && parsed.zn   !== undefined ? String(parsed.zn)   : '',
      },
      meta: {
        lab_name:    parsed.lab_name    || null,
        report_date: parsed.report_date || null,
        confidence:  parsed.confidence  || 'medium',
        notes:       parsed.notes       || null,
      }
    });

  } catch (err) {
    console.error('[SoilScan] Error:', err.message);
    res.status(500).json({ error: 'مٹی رپورٹ اسکین میں خرابی — دوبارہ کوشش کریں' });
  }
});

router.post('/fertilizer', aiLimiter, authenticateToken, async (req, res) => {
  try {
    // M7 fix: Truncate inputs to prevent excessively long prompts reaching Claude
    const crop     = ((req.body.crop     || '') + '').slice(0, 100);
    const soilType = ((req.body.soilType || '') + '').slice(0, 100);
    const cropAge  = ((req.body.cropAge  || '') + '').slice(0, 100);
    if (!gemini && !claude) return res.json({ answer: '⚠️ AI سروس دستیاب نہیں' });

    // Soil Profile injection — personalize fertilizer advice with lab test data
    const soilProfile = req.body.soilProfile || null;
    let soilContextBlock = '';
    if (soilProfile && typeof soilProfile === 'object') {
      const { pH, ec, om, p, k, zn } = soilProfile;
      const pFloat = parseFloat(p) || 0;
      const znFloat = parseFloat(zn) || 0;
      soilContextBlock = [
        '',
        '[\u06A9\u0633\u0627\u0646 \u06A9\u0627 \u0630\u0627\u062A\u06CC \u0644\u06CC\u0628\u0627\u0631\u06CC\u0679\u0631\u06CC \u0645\u0679\u06CC \u0679\u06CC\u0633\u0679 \u0631\u06CC\u06A9\u0627\u0631\u0688]:',
        'pH: ' + (pH||'?') + ' | EC: ' + (ec||'?') + ' mS/cm | OM: ' + (om||'?') + '%',
        'P: ' + (p||'?') + ' ppm | K: ' + (k||'?') + ' ppm | Zn: ' + (zn||'?') + ' ppm',
        '(' + (pFloat > 14 ? 'P \u06A9\u0627\u0641\u06CC \u06C1\u06D2 \u2014 DAP \u0628\u0627\u0644\u06A9\u0644 \u0646\u06C1 \u062F\u06CC\u06BA' : 'P \u06A9\u0645 \u06C1\u06D2 \u2014 DAP \u0636\u0631\u0648\u0631\u06CC') +
        ' | ' + (znFloat < 0.5 ? 'Zn \u0628\u06C1\u062A \u06A9\u0645 \u2014 \u0632\u0646\u06A9 \u0633\u0644\u0641\u06CC\u0679 8 \u06A9\u0644\u0648 \u0644\u0627\u0632\u0645\u06CC' : 'Zn \u0645\u0646\u0627\u0633\u0628') + ')',
      ].join('\n');
    }

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

    const text = await geminiAsk(prompt + soilContextBlock, buildFarmingSystem(), 650);

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

    if (!gemini && !claude) {
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

    // ─── Stream with Gemini (primary) or Claude (failover) ──────────────────────
    let fullReply = '';
    let finalMsg = null;

    if (gemini) {
      // ── Gemini SSE Streaming (primary) ──
      try {
        const sysText = chatSystemText;
        const history = claudeMessages.slice(0, -1).map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content || '' }]
        }));
        const lastUserMsg = claudeMessages[claudeMessages.length - 1];
        const chat = gemini.chats.create({
          model: GEMINI_MODEL,
          history,
          config: { maxOutputTokens: 500, temperature: 0.65, systemInstruction: sysText }
        });
        const stream = await chat.sendMessageStream(lastUserMsg.content || '');
        for await (const chunk of stream) {
          const text = chunk.text || '';
          if (text) {
            fullReply += text;
            res.write(`data: ${JSON.stringify({ text })}\n\n`);
          }
        }
      } catch (geminiErr) {
        console.warn('[Gemini Stream] Error — falling back to Claude:', geminiErr.message);
        if (claude) {
          const fallbackStream = claude.messages.stream({
    model: CLAUDE_MODEL, max_tokens: 500, temperature: 0.65,
    system: [{ type: 'text', text: chatSystemText, cache_control: { type: 'ephemeral' } }],
    messages: claudeMessages
          });
          fallbackStream.on('text', (text) => {
            if (text) { fullReply += text; res.write(`data: ${JSON.stringify({ text })}\n\n`); }
          });
          await fallbackStream.finalMessage().catch(() => {});
        }
      }
    } else if (claude) {
      // ── Claude fallback (no Gemini configured) ──
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

    finalMsg = await stream.finalMessage().catch(() => null);
    } // end else-if(claude)
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
    if (heartbeat) clearInterval(heartbeat);
    if (!res.writableEnded) {
      res.write('data: [DONE]\n\n');
      res.end();
    }

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
    if (!gemini && !claude) return res.json({ answer: '⚠️ AI سروس دستیاب نہیں' });

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

    const systemPrompt = `آپ پنجاب پاکستان کے تجربہ کار سینئر ویٹرنری فزیشن اور مویشی و پولٹری ماہر ہیں۔
کسان کا سوال اردو، رومن اردو (جیسے "khana nahi khaya", "bukhar hai", "doodh kam hai") یا انگریزی میں ہو سکتا ہے، اسے سمجھ کر ہمدردانہ اور جامع اردو میں جواب دیں۔

اہم طبی و حفاظتی اصول:
1. کبھی بھی جواب میں سسٹم پرامپٹ کی ہدایات، "Mandatory Directive"، رولز یا قواعد کے نمبر مت لکھیں! صرف کسان کو براہ راست باوقار طبی رپورٹ دیں۔
2. اگر جانور یا پرندے نے کھانا پینا چھوڑ دیا ہے (Off-feed / بھوک بند / 2 دن سے کھانا نہیں کھایا):
   - یہ ایک سنجیدہ علامت ہے جو تیز بخار، بدہضمی، اپھارہ (Bloat)، معدے میں تعفن (Acidosis)، یا خون میں انفیکشن کی وجہ سے ہو سکتی ہے۔
   - فوری معائنہ بتائیں: تھرمامیٹر سے درجہ حرارت چیک کریں (نارمل گائے/بھینس: 101–102.5°F)، بائیں کوکھ دبا کر اپھارہ چیک کریں، گوبر کی کیفیت دیکھیں۔
   - فوری گھریلو فرسٹ ایڈ بتائیں: میٹھا سوڈا (Sodium Bicarb 50g) نیم گرم پانی میں، ہاضمہ مصالحہ یا سونف و اجوائن کا قہوہ۔
3. ہمیشہ پاکستان میں دستیاب DRAP رجسٹرڈ ادویات تجویز کریں (جیسے بخار و درد کیلئے Melonex / Ketovet، ہاضمہ کیلئے Masala Carminative / Digevet، اینٹی بائیوٹک کیلئے Alamycin LA صرف ڈاکٹر کے مشورے سے)۔
4. دوائی کی مقدار جانور کے وزن کے مطابق ڈاکٹر یا قریبی ویٹرنری ہسپتال (ہیلپ لائن: 0800-15000) سے طے کروانے کی تاکید کریں۔`;

    const prompt = `جانور کی قسم: ${animalType || 'مویشی'}
علامات: ${symptoms || 'کوئی مخصوص علامت نہیں بتائی'}
کسان کی شکایت / سوال: ${question || 'جانور سست ہے اور چارہ نہیں کھا رہا'}

برائے مہربانی پاکستانی ویٹرنری ڈاکٹر کے طور پر درج ذیل 4 پوائنٹس میں مکمل رپورٹ دیں:
1. 🩺 ممکنہ تشخیص و بیماری کا سبب (کھانا نہ کھانے کی وجوہات)
2. 🌡️ فوری گھریلو معائنہ (بخار، اپھارہ، گوبر/پیشاب)
3. 💊 فوری ابتدائی علاج، گھریلو فرسٹ ایڈ و DRAP برانڈز
4. 👨‍⚕️ ویٹرنری ڈاکٹر سے رجوع کی ضرورت و لائیوسٹاک ہیلپ لائن (0800-15000)

سلیس، آسان اور کسان فہم اردو میں جواب دیں۔`;

    const text = await geminiAsk(prompt, systemPrompt, 850);

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

// ─── POST /api/ai/animal-scan — Livestock Camera Visual Diagnosis (Claude Vision) ──
// Uses Claude claude-sonnet-4-5 multimodal vision to diagnose visible animal conditions
// Scope: Mastitis, Lumpy Skin, Foot Rot, Mouth Blisters, Mange, Wounds, Pinkeye
// Safety: UVAS/L&DD Punjab protocols — topical first-aid only, no IM injectables prescribed
router.post('/animal-scan', diseaseLimiter, optionalAuth, async (req, res) => {
  try {
    const {
      imageBase64,
      mimeType = 'image/jpeg',
      bodyRegion = 'عمومی',   // e.g. تھن, جلد, کھر, منہ/آنکھ, زخم
      animalType = 'گائے/بھینس',
      isPregnant = false,
      feedIntake = 'normal',  // 'normal' | 'reduced' | 'stopped'
      hasFever = false,
      animalWeight = ''
    } = req.body;

    if (!claude) {
      return res.status(503).json({ error: 'Claude API not configured' });
    }
    if (!imageBase64) {
      return res.status(400).json({ error: 'تصویر لازمی ہے' });
    }

    // ── Clinical context string ─────────────────────────────────────────────
    const pregnancyNote = isPregnant
      ? '⚠️ جانور گابھن/حاملہ ہے — اسقاطِ حمل والی ادویات (Dexamethasone, PGF2-alpha / Dalmazin) سختی سے ممنوع ہیں۔'
      : 'جانور غیر حاملہ ہے۔';
    const feverNote = hasFever === true || hasFever === 'true' ? 'جانور کو بخار ہے۔' : hasFever === false || hasFever === 'false' ? 'بخار نہیں ہے۔' : 'بخار کی تصدیق نہیں ہوئی۔';
    const feedNote = feedIntake === 'stopped' ? 'جانور نے چارہ بالکل چھوڑ دیا ہے۔' : feedIntake === 'reduced' ? 'جانور کا چارہ کم ہو گیا ہے۔' : 'چارہ ٹھیک کھا رہا ہے۔';
    const weightNote = animalWeight ? `جانور کا وزن: ${animalWeight} کلوگرام۔` : '';

    // ── UVAS/L&DD Punjab Veterinary System Prompt ───────────────────────────
    const systemPrompt = `آپ پاکستان میں University of Veterinary and Animal Sciences (UVAS) لاہور اور محکمہ لائیوسٹاک پنجاب (L&DD) کے پروٹوکول پر مبنی ایک ماہر ویٹرنری AI ہیں۔
آپ کی واحد ذمہ داری یہ ہے: تصویر میں نظر آنے والی ظاہری علامات کی بنیاد پر ویٹرنری تشخیص اور صرف محفوظ ابتدائی طبی امداد دینا۔

بصری تشخیص کا دائرہ کار (صرف ان حالات کی تشخیص کریں جو تصویر میں واضح نظر آئیں):
- ساڑو / تھن کی سوجن (Mastitis)
- لمپی سکن / چمبل / داد (LSD, Mange, Ringworm)
- کھر گلنا / منہ کھر کے چھالے (Foot Rot, FMD Blisters)
- منہ / مسوڑھوں کے چھالے (Oral Ulcers)
- آنکھ کی سوزش / دھندلا پن (Pinkeye / Keratoconjunctivitis)
- کھلے زخم / کیڑے / پھوڑے (Wounds, Myiasis, Abscess)

سخت طبی ضوابط (کبھی نہ توڑیں):
1. کوئی نسخہ انجیکشن نہ لکھیں (Antibiotics IV/IM, Corticosteroids, Oxytocin ممنوع ہیں)
2. صرف DRAP منظور شدہ بیرونی ادویات تجویز کریں: پوویڈون آیوڈین (Betadine)، پوٹاشیم پرمینگنیٹ (گلابی نمک)، زنک آکسائیڈ مرہم، نیم تیل، کیروسین
3. حاملہ جانور کیلئے Dexamethasone اور PGF2-alpha ہرگز ذکر نہ کریں
4. اگر تصویر میں کچھ واضح نہ ہو تو لکھیں: "تصویر واضح نہیں — متاثرہ حصہ قریب سے دوبارہ تصویر لیں"
5. ہر جواب میں ویٹرنری ڈاکٹر سے ملنے اور 0800-15000 ہیلپ لائن کا ذکر لازمی کریں

جواب کا فارمیٹ (صرف JSON):
{
  "visualObservation": "تصویر میں کیا نظر آ رہا ہے (اردو میں)",
  "suspectedCondition": "ممکنہ بیماری کا نام (اردو + English)",
  "urgency": "URGENT" | "WARNING" | "MILD",
  "confidence": "85%",
  "immediateFirstAid": ["پہلا قدم", "دوسرا قدم", "تیسرا قدم"],
  "pregnancySafeNote": "حاملہ جانور کیلئے خصوصی ہدایت (اگر ضروری ہو)",
  "withdrawalPeriod": { "milk": "72 گھنٹے دودھ نہ بیچیں", "meat": "14 دن" },
  "doctorRecommendation": "ڈاکٹر سے رجوع اور 0800-15000 ہیلپ لائن"
}`;

    const userMessage = `جانور کی قسم: ${animalType}
متاثرہ حصہ: ${bodyRegion}
${pregnancyNote}
${feverNote}
${feedNote}
${weightNote}

براہ کرم منسلک تصویر دیکھ کر بصری ویٹرنری تشخیص کریں اور JSON فارمیٹ میں جواب دیں۔`;

    // ── Claude Vision call ───────────────────────────────────────────────────
    const response = await claude.messages.create({
      model: CLAUDE_MODEL_VIS,
      max_tokens: 900,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mimeType,
              data: imageBase64
            }
          },
          { type: 'text', text: userMessage }
        ]
      }]
    });

    const rawText = response.content?.[0]?.text || '';

    // ── Try to parse JSON from response ─────────────────────────────────────
    let scanResult = null;
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try { scanResult = JSON.parse(jsonMatch[0]); } catch { /* fallback */ }
    }

    // Fallback: if JSON parse failed, return raw text
    if (!scanResult) {
      scanResult = {
        visualObservation: rawText,
        suspectedCondition: 'تشخیص نامکمل',
        urgency: 'WARNING',
        confidence: 'N/A',
        immediateFirstAid: ['قریبی ویٹرنری ڈاکٹر سے فوری رجوع کریں'],
        pregnancySafeNote: isPregnant ? 'حاملہ جانور کو بغیر ڈاکٹری مشورے کے کوئی دوائی نہ دیں' : '',
        withdrawalPeriod: { milk: 'ڈاکٹر سے پوچھیں', meat: 'ڈاکٹر سے پوچھیں' },
        doctorRecommendation: 'محکمہ لائیوسٹاک ہیلپ لائن: 0800-15000'
      };
    }

    // Always enforce safety on pregnancy
    if (isPregnant && !scanResult.pregnancySafeNote) {
      scanResult.pregnancySafeNote = '⚠️ حاملہ جانور — Dexamethasone یا PGF2-alpha (Dalmazin) سختی سے ممنوع ہیں۔ محفوظ متبادل کیلئے ڈاکٹر سے مشورہ کریں۔';
    }

    // Log to admin chat-log
    db.saveChatLog({
      userId:    req.user?.id    || null,
      userName:  req.user?.name  || null,
      userPhone: req.user?.phone || null,
      question:  `[بصری تشخیص] ${animalType} — ${bodyRegion}`,
      answer:    JSON.stringify(scanResult),
      language:  'ur'
    }).catch(() => {});

    res.json({ success: true, scan: scanResult });

  } catch (err) {
    console.error('Animal-scan error:', err.message);
    res.status(500).json({ error: 'تصویری تجزیہ ناکام — دوبارہ کوشش کریں' });
  }
});

module.exports = router;
