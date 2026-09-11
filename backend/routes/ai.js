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
const claudeKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;

if (claudeKey) {
  claude = new Anthropic({ apiKey: claudeKey });
  console.log('✅ Claude API configured — Vision & Text fallback: claude-sonnet-4-5');
} else {
  console.warn('⚠️  CLAUDE_API_KEY / ANTHROPIC_API_KEY not set');
}

const CLAUDE_MODEL     = process.env.CLAUDE_MODEL || 'claude-sonnet-4-5';
const CLAUDE_MODEL_VIS = process.env.CLAUDE_MODEL_VIS || 'claude-sonnet-4-5';

// ─── Gemini Client (Vision & Text primary engine) ────────────────────────────
let gemini = null;
if (process.env.GEMINI_API_KEY) {
  gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  console.log('✅ Gemini API configured — Primary multimodal engine: gemini-3.6-flash');
} else {
  console.warn('⚠️  GEMINI_API_KEY not set — Falling back to Claude');
}
const GEMINI_MODEL     = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
const GEMINI_MODEL_VIS = process.env.GEMINI_MODEL_VIS || 'gemini-3.6-flash';


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
- عملی، جامع اور مرحلہ وار رہنمائی — اہم نکات، طریقہ کار، خوراک/مقدار اور احتیاطیں واضح بلٹ پوائنٹس میں بیان کریں
- جملہ کبھی بھی ادھورا مت چھوڑیں — اپنی بات کو ہمیشہ مکمل اور واضح طور پر ختم کریں
- صرف پاکستان میں آسانی سے ملنے والی دوائیں اور کھادیں تجویز کریں
- موسم اور وقت کے مطابق مشورہ دیں
- غیر یقینی ہو تو: ہمیشہ مقامی زرعی افسر (Extension Officer) سے ملنے کا مشورہ دیں اور 0800-17000 (زراعت) یا 0800-15000 (لائیوسٹاک) ہیلپ لائن بتائیں
- ⚠️ کیمیائی خوراک کے بارے میں کبھی بھی تخمینہ یا اندازہ مت لگائیں — صرف SFRI/AARI/DRAP سے مصدقہ مقداریں بتائیں
- ہر جواب کے آخر میں متعلقہ سرکاری ماخذ بتائیں (مثلاً: 📚 ماخذ: AARI فیصل آباد)
- اگر کوئی فصل یا بیماری آپ کے علم میں نہیں تو صراحت کریں: "اس کے بارے میں مصدقہ معلومات دستیاب نہیں — مقامی زرعی افسر سے رابطہ کریں"
- اعداد اور مقدار واضح لکھیں (مثلا: 1 بوری DAP فی ایکڑ)

فارمیٹنگ کے اصول:
- عنوانات کے لیے صرف مارک ڈاؤن ## استعمال کریں (کوئی بریکٹ [ ] مت لگائیں)
- نکات کے لیے صرف - کا نشان استعمال کریں
- اہم نام اور مقدار کو **bold** کریں`;
}


function buildChatSystem(language) {
  const now    = new Date();
  const month  = now.getMonth() + 1;
  const season = (month >= 5 && month <= 10) ? 'خریف (چاول، کپاس، مکئی، کماد)' : 'ربیع (گندم، آلو، سرسوں، چنا)';
  const year   = now.getFullYear();

  if (language === 'en') {
    return `You are DehatiAI, an expert, friendly agricultural assistant for farmers in Punjab, Pakistan.
Current agricultural season: ${season} | Year: ${year}
CRITICAL DOMAIN GUARD: You ONLY answer questions related to agriculture, farming, crops, livestock, irrigation, soil, Mandi prices, pests/diseases, fertilizers, and rural Pakistan. For ANY off-topic question, politely respond: "Sorry, I can only assist with farming, crops, livestock, and agriculture topics."

Instructions for comprehensive, high-quality answers:
- If the user greets or asks a casual question, reply warmly and ask how you can help their farm or livestock today.
- For farming, irrigation, fertilizer, disease, sowing, or livestock questions, provide **complete, structured, step-by-step agronomic advice**:
  1. **Direct Answer & Best Timing/Method**: Exact best time (e.g. early morning or evening for irrigation), method, and scientific reason.
  2. **Critical Stages & Measurements**: Specific crop stages (e.g. crown root initiation, flowering, grain development) and exact dosages per acre.
  3. **Weather & Precautionary Warnings**: Weather considerations (e.g. avoid irrigation in high winds or rain forecast).
  4. **Never Leave Thoughts Incomplete**: Always complete every sentence and finish thoughts thoroughly.
- Formatting:
  - Use ## for section headings (NEVER square brackets [ ])
  - Use - for bullet points
  - Use **bold** for key names, varieties, timings, and dosages
Helpline: 0800-15000 (free)`;
  }

  if (language === 'pa' || language === 'pj') {
    return `تسی DehatiAI او — پنجاب دے کسان بھراواں دے مخلص، بااعتماد تے تجربہ کار زرعی ساتھی۔
موجودہ فصل دا موسم: ${season} | سال: ${year}
⚠️ اہم: تسی صرف زراعت، فصلاں (کݨک، کپاہ، کماد، چاول، مکئی)، ڈنگراں (مجھ، گاں، بکری)، کھاد، بیماریاں، سپرے، آبپاشی، تے منڈی ریٹاں توں متعلق سوالاں دا جواب دیو گے۔ کسے بھی غیر زرعی سوال لئی صرف آکھو: "معذرت، میں صرف زرعی سوالاں تے مال ڈنگر بارے رہنمائی دے سکدا واں۔"

رہنمائی دے اصول:
- سلام یا عام گل بات دا مٹھا تے پرخلوص جواب دیو۔
- فصلاں، کھاد، بیماریاں، آبپاشی یا ڈنگراں دے سوالاں لئی **جامع، مکمل تے مرحلہ وار رہنمائی** دیو:
  1. **سدھا جواب تے صحیح وقت/طریقہ**: مثلاً آبپاشی لئی فجر یا شام دا ویلا، کڑاکے دی دھپ وچ پانی نہ لاؤ۔
  2. **فصل یا ڈنگر دے نازک مرحلے تے فی ایکڑ صحیح مقدار**: اہم مرحلے تے منظور شدہ دوائی/کھاد دی مقدار۔
  3. **موسم تے احتیاطی تدابیر**: تیز ہوا یا بارش دی پیشگوئی ہووے تاں پانی یا سپرے نہ کرو تاکہ فصل نہ ڈگے یا دوائی نہ دھوئے جائے۔
  4. ⚠️ **جملہ کدے وی ادھورا مت چھڈو**: اپنی گل نوں ہمیشہ پورا، واضح تے تسلی بخش انداز وچ مکاؤ۔
- فارمیٹنگ:
  - ہیڈنگ لئی ## استعمال کرو (کوئی بریکٹ [ ] نہ لاؤ)
  - نکتیاں لئی - دا نشان لاؤ
  - اہم لفظاں، اوقات تے مقدار نوں **bold** کرو
زراعت ہیلپ لائن: 0800-15000 (مفت)`;
  }

  if (language === 'skr' || language === 'saraiki') {
    return `تساں DehatiAI او — وسیب تے جنوبی پنجاب (ملتان، بہاولپور، ڈیرہ غازی خان، رحیم یار خان، مظفر گڑھ، لیہ، لودھراں) دے کساناں دے مخلص زرعی ماہر تے سنگی۔
موجودہ موسم: ${season} | سال: ${year}
⚠️ اہم: تساں صرف زراعت، فصلاں (کݨک، کپاہ/پھٹی، کماد، چاول، تل، مکئی)، مال ڈنگر (ڳاں، مہی/مجھ، ٻکری، چھیلہ)، کھاد، بیماریاں، آبپاشی، نہری وارابندی تے منڈی دے بھا (ریٹ) بارے ڳالھ کریسو۔
کوئی وی غیر زرعی سوال آوݨ تے صرف اکھسو: "معذرت، میں صرف زراعت تے مال ڈنگر بارے ڳالھ کر سڳدا ہاں۔ فصل، کھاد، بیماری یا جانوراں بارے پچھو۔"

رہنمائی دے اصول:
- پورا جواب خالص، مٹھی تے ٹھیٹھ سرائیکی (Saraiki) وچ ݙیوو۔
- سرائیکی زرعی الفاظ استعمال کرو: کݨک، پھٹی/کپاہ، مہی/مجھ، ٻکرا، پاݨی ݙیوݨ، چݨائی، کݙاں، کینجھا، بھا، واری۔
- فصلاں، پاݨی، کھاد، بیماری یا مال ڈنگر بارے **جامع، مکمل تے مرحلہ وار رہنمائی** ݙیوو:
  1. **سدھا حل تے صحیح ویلا/طریقہ**: مثلاً پاݨی ݙیوݨ دا بہترین ویلا صبح فجر یا شام کوں ہے، سِجھ دی کڑاکے دی دھپ وچ پاݨی نئیں ݙیوݨا۔
  2. **فصل دے اہم مرحلے تے مقدار**: فصل دے نازک مرحلے تے فی ایکڑ صحیح مقدار۔
  3. **موسم دی احتیاط**: تیز جھکڑ (تیز ہوا) یا مینگھ (بارش) ہووے تاں پاݨی یا سپرے روکو۔
  4. ⚠️ **جملہ کݙاہیں وی ادھورا مت چھوڑو**: پوری ڳالھ تسلی نال واضح مکاؤ۔
- فارمیٹنگ:
  - عنوان لئی شروع وچ ## استعمال کرو (کوئی بریکٹ [ ] نہ لاؤ)
  - اہم لفظاں کوں **bold** کرو
ہیلپ لائن: 0800-15000 (مفت)`;
  }

  return `آپ DehatiAI ہیں — پنجاب و پاکستان کے کسانوں کا بااعتماد اور مستند AI زرعی مشیر۔
موجودہ زرعی موسم: ${season} | سال: ${year}
⚠️ اہم: آپ صرف زراعت، فصلوں، جانوروں، مٹی، موسم، منڈی قیمتوں اور دیہی پاکستان سے متعلق سوالات کا جواب دیں گے۔ کوئی بھی غیر زرعی سوال آنے پر صرف کہیں: "معذرت، میں صرف زرعی موضوعات پر بات کر سکتا ہوں۔ فصل، کھاد، بیماری، آبپاشی، جانور یا اسکیموں سے متعلق پوچھیں۔"

رہنمائی اور جواب کے رہنما اصول:
- اگر کسان سلام کرے یا حال احوال پوچھے تو پرخلوص، دوستانہ اور مختصر جواب دیں اور پوچھیں کہ آج وہ اپنی فصل یا جانور کے بارے میں کیا پوچھنا چاہتے ہیں۔
- جب کسان فصل، کھاد، بیماری، سپرے، آبپاشی، زمین، منڈی یا جانور کے بارے میں پوچھے، تو **جامع، تفصیلی اور مرحلہ وار رہنمائی** فراہم کریں:
  1. **براہِ راست جواب اور بہترین وقت/طریقہ**: واضح جواب دیں کہ کیا کرنا ہے، کس وقت کرنا ہے (مثلاً آبپاشی کے لیے صبح سویرے یا شام کے وقت، تیز دھوپ میں پرہیز کریں) اور اس کی سائنسی وجہ۔
  2. **فصل یا جانور کے اہم مراحل**: مخصوص فصل کے نازک مراحل بتائیں (مثلاً گندم کے لیے تاجی جڑیں نکلنے، گوبھ، اور دانہ بننے کا مرحلہ؛ کپاس کے لیے ڈوڈیاں اور پھول بننے کا وقت)۔
  3. **مصدقہ مقدار و خوراک**: فی ایکڑ یا فی جانور درکار مصدقہ خوراک اور کیمیکل/کھاد کی پیمائش واضح بتائیں۔
  4. **موسمی انتباہ و احتیاط**: موسم کی مناسبت سے احتیاطی تدابیر بتائیں (مثلاً تیز ہوا یا بارش کے امکان پر آبپاشی اور سپرے روک دیں تاکہ فصل گرنے یا دوائی دھلنے سے بچ سکے)۔
  5. ⚠️ **جملوں کی تکمیل (انتہائی اہم)**: کبھی بھی کوئی جملہ یا نکتہ ادھورا مت چھوڑیں۔ بات کو ہمیشہ مکمل، واضح اور اختتام تک پہنچا کر ختم کریں۔

فارمیٹنگ کے اصول:
- عنوانات کے لیے صرف مارک ڈاؤن ## استعمال کریں (کوئی بریکٹ [ ] مت لگائیں)
- اہم ناموں، مقداروں اور اوقات کو **bold** کریں
- نکات کے لیے - کا نشان استعمال کریں
- زراعت ہیلپ لائن: 0800-15000 (مفت)`;
}

function aiUnavailable() {
  return { answer: '⚠️ AI سروس ابھی دستیاب نہیں — CLAUDE_API_KEY ترتیب دیں', disabled: true };
}

// ——— Helpers —————————————————————————————————————————————————————————————————
async function claudeAsk(prompt, systemPrompt, maxTokens = 1500, temperature = 0.6) {
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
  return sanitizeAIOutput(text);
}

function sanitizeAIOutput(raw) {
  if (!raw || typeof raw !== 'string') return '';
  return raw
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
    .replace(/<thought>[\s\S]*?<\/thought>/gi, '')
    .replace(/^[ \t]*(\)|\()?at start\?[^\n]*\n*/gi, '')
    .replace(/^[ \t]*Heading starts with[^\n]*\n+/gi, '')
    .replace(/\n+`?No\s*$/gi, '')
    .replace(/^\[([^\n\]]+)\]$/gm, '## $1')
    .replace(/^\[(?!\d)/gm, '')
    .trim();
}

// ─── Gemini Ask Helper (primary text engine — all non-vision endpoints) ────────
async function geminiAsk(prompt, systemPrompt, maxTokens = 1500) {
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
    const text = sanitizeAIOutput(response.text || '');
    db.logAIUsage({
      endpoint: 'gemini_ask',
      provider: 'gemini',
      model: GEMINI_MODEL,
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

    // ——— Farmer profile context injection (میرا فارم) ———
    let askFarmerCtx = '';
    if (req.user?.id) {
      try {
        const fp = await db.getFarmerProfile(req.user.id);
        askFarmerCtx = db.buildFarmerContext(fp);
      } catch {}
    }

    // M4 fix: Cache lookup — reuse previous answers for identical questions
    const cached = await aiCache.get(q, language);
    if (cached) {
      // Still log cached hits so admin can see what farmers are asking
      db.saveChatLog({
        userId:    req.user?.id       || null,
        userName:  req.user?.name     || null,
        userPhone: req.user?.phone    || null,
        district:  req.user?.district || req.body?.district || null,
        question:  q,
        answer:    cached,
        language
      }).catch(() => {});
      return res.json({ answer: cached, fromCache: true });
    }

    const askSystemPrompt = buildChatSystem(language) + askFarmerCtx;
    const text = await geminiAsk(qWithSoil, askSystemPrompt, 1500);

    // M4 fix: Save to cache for future requests
    if (text) aiCache.set(q, language, text);

    // Save to chat_logs so it appears in admin Questions tab
    if (text) {
      db.saveChatLog({
        userId:    req.user?.id       || null,
        userName:  req.user?.name     || null,
        userPhone: req.user?.phone    || null,
        district:  req.user?.district || req.body?.district || null,
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
    const { imageBase64, cropName, diseaseKey, mimeType = 'image/jpeg', district, symptoms, cropAge } = req.body;
    const farmerDistrict = district || req.user?.district || null;

    if (imageBase64 && Buffer.byteLength(imageBase64, 'base64') > 5 * 1024 * 1024) {
      return res.status(413).json({ error: 'تصویر کا سائز 5MB سے زیادہ نہیں ہونا چاہیے۔' });
    }

    // ── Step 1: Check database or require AI analysis ─────────
    const tier1 = modelInference.predictDisease(imageBase64, cropName, diseaseKey);

    console.log(
      `[Scanner] Crop: "${cropName || 'none'}" → "${tier1.disease_en}" | ` +
      `Source: ${tier1.source} | ` +
      `Local DB: ${tier1.hasLocalRecord ? '✓ Match' : '✗ Unknown'}`
    );

    // ══════════════════════════════════════════════════════════════════════════
    // TIER 1: LOCAL DATABASE OR CATALOG MATCH (No image, or direct disease selection)
    // ══════════════════════════════════════════════════════════════════════════
    if ((tier1.source === 'database_match' && tier1.hasLocalRecord) || (diseaseKey && !imageBase64)) {
      console.log(`[Tier-1 ✅ CATALOG/LOCAL MATCH] ${tier1.localKey || diseaseKey} → ${tier1.disease_en}`);
      const respData = {
        tier:                    1,
        source:                  'database_match',
        source_label:            '📖 ڈائریکٹری سے تصدیق شدہ ریکارڈ',
        model_attribution:       '✓ تصدیق شدہ زرعی ڈیٹابیس',
        confidence:              95,
        disease_ur:              tier1.disease_ur || cropName || 'زرعی بیماری',
        disease_en:              tier1.disease_en || diseaseKey || 'Crop Disease',
        disease_roman:           tier1.disease_roman || '',
        disease:                 tier1.disease || `${tier1.disease_ur || 'بیماری'} (${tier1.disease_en || ''})`,
        severity:                tier1.severity || 'درمیانہ',
        cause:                   tier1.cause || 'پھپھوندی / کیڑا (Pathogen)',
        symptoms_analysis:       tier1.symptoms_analysis || '',
        emergency_action:        tier1.emergency_action || 'فوری طور پر نائٹروجن (یوریا) کا استعمال روکیں اور نکاسی آب بہتر بنائیں',
        treatment:               tier1.treatment || 'مناسب پھپھوندی کش یا دافع حشرات دوائی کا سپرے کریں۔',
        spray_conditions:        tier1.spray_conditions || 'صبح 9 بجے سے پہلے یا شام کے وقت سپرے کریں۔ تیز ہوا یا دھوپ میں پرہیز کریں۔',
        fertilizer_adjustment:   tier1.fertilizer_adjustment || 'یوریا کھاد فوری روکیں اور پوٹاش کی متوازن مقدار دیں۔',
        prevention:              tier1.prevention || 'کھیت صاف رکھیں، متوازن کھاد دیں اور پانی کی نکاسی کا انتظام رکھیں۔',
        withholding_period_days: tier1.withholding_period_days || 14,
        organic_alternative:     tier1.organic_alternative,
        medicines:               tier1.medicines || [],
        disclaimer:              'استعمال سے پہلے مقامی زرعی افسر سے تصدیق کروائیں۔'
      };

      // Non-blocking log to Questions tab
      db.saveChatLog({
        userId:    req.user?.id       || null,
        userName:  req.user?.name     || null,
        userPhone: req.user?.phone    || null,
        district:  req.user?.district || req.body?.district || null,
        question:  `[بیماری تشخیص] ${cropName || 'فصل'}: ${respData.disease_ur}`,
        answer:    respData.treatment || respData.disease_ur,
        language:  'ur'
      }).catch(() => {});

      return res.json(respData);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // TIER 2: MULTIMODAL VISION AI (Gemini Vision primary + Claude Vision secondary)
    // ══════════════════════════════════════════════════════════════════════════
    if (imageBase64 && (gemini || claude)) {
      const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      const safeMime     = ALLOWED_MIME.includes(mimeType) ? mimeType : 'image/jpeg';
      const month        = new Date().getMonth() + 1;
      const season       = (month >= 5 && month <= 10) ? 'خریف (Kharif)' : 'ربیع (Rabi)';

      let promptText = `Current Agricultural Season in Pakistan: ${season}\n`;
      if (farmerDistrict) promptText += `Location/District: ${farmerDistrict}, Pakistan\n`;
      if (cropName) promptText += `Crop specified by farmer: ${cropName}\n`;
      else promptText += `Crop: Auto-detect crop type from leaf structure\n`;
      if (cropAge) promptText += `Crop Age / Growth Stage: ${cropAge}\n`;
      if (symptoms) promptText += `Farmer observations: ${symptoms}\n`;
      promptText += `Examine the leaf image in detail. Perform microscopic visual pathology triage and provide the complete agronomy diagnosis and prescription in JSON format.`;

      const samplePakistaniMeds =
        'Nativo 75WG, Tilt 250EC, Amistar Top, Score 250EC, Ridomil Gold MZ 68WG, ' +
        'Coragen 20SC, Match 050EC, Radiant 120SC, Belt 480SC, Movento 240SC, ' +
        'Confidor 200SL, Polo 500SC, Ulala 50WG, Delegate 250WG, Proclaim 1.9EC, ' +
        'Cuprocaffaro, Kasumin 2L, Daconil 75WP, Antracol 70WP, Beam 75WP, ' +
        'Regent 0.4G, Padan 4G, Ferterra 0.4G, Virtako 40WG, Aliette 80WP, Acrobat MZ';

      const systemPrompt =
`You are Dr. Zara, Chief Plant Pathologist and Senior Agronomist with 25+ years field experience in Punjab, Sindh, and Khyber Pakhtunkhwa, Pakistan.
Your mission is to perform elite visual agronomic diagnosis and prescribe the highest-standard Pakistani agricultural treatments for farmers.

DIAGNOSTIC TRIAGE PROTOCOL:
1. Differential Diagnosis: Distinguish carefully between:
   - Fungal Blights / Rusts / Mildew / Anthracnose (lesions, concentric rings, pustules, water-soaked margins, fungal mycelium)
   - Bacterial Infections (angular leaf spots, water-soaking, bacterial ooze, leaf blight)
   - Viral Diseases (leaf curling, yellow vein mosaic, stunting)
   - Sucking Pests / Chewers (whitefly nymphs, thrips rasping, mites webbing, armyworm/borer frass & holes)
   - Nutrient Deficiencies & Abiotic Stress (Zinc deficiency chlorosis, Nitrogen burn, drought curl, salt scorch).
2. Severity Assessment: Classify infection severity:
   - 'ابتدائی (Early / <15% affected)'
   - 'درمیانہ (Moderate / 15-40% affected)'
   - 'شدید (Severe / >40% affected)'
3. First 24-Hour Emergency Action (پہلا فوری قدم):
   - What the farmer MUST do immediately (e.g. stop urea/nitrogen to starve fungal growth, drain excess water, isolate field).
4. Precision Chemical Prescriptions:
   - Prescribe 2-3 verified brands registered with DRAP and Punjab Agriculture Extension.
   - Include both Per Acre dosage AND Per 20-Liter Knapsack Sprayer Tank (ڈرمکی) dose! (e.g. "16 تا 20 گرام فی 20 لیٹر ڈرمکی (5 ڈرمکیاں فی ایکڑ)").
   - Include water volume (100-120 Liters/acre) and nozzle type (Hollow cone nozzle / کھوکھلی کون نوزل).
5. Optimal Spray Conditions:
   - Exact hours (صبح 9 بجے سے پہلے یا شام 4 بجے کے بعد).
   - Weather precautions (ہوا کی رفتار 10 کلومیٹر سے کم، بارش کا امکان نہ ہو، تیز دھوپ میں نہ کریں).
6. Fertilizer & Irrigation Adjustment:
   - Practical nutrient tips (e.g. stop Nitrogen/Urea which fuels fungal spread; apply Potash SOP/MOP to harden cell walls).
7. Organic / Biological Alternatives:
   - Low-cost farmer remedies: Neem seed extract (5ml/L), wood ash, fermented sour lassi (10%), tobacco extract, garlic spray.
8. Future Prevention & Resistant Seed Varieties:
   - Official Pakistani recommended varieties and seed treatment fungicides (e.g. Hombre, Dividend Star, Celest).

Respond strictly in valid JSON format:
{
  "disease_ur": "بیماری یا کیڑے کا مستند اردو نام (مثلاً: مکئی کا پتا جھلساؤ)",
  "disease_en": "Standard English Disease Name (e.g. Northern Corn Leaf Blight)",
  "disease_roman": "Roman Urdu Name (e.g. Makkai ka Patton ka Jhulsa)",
  "severity": "ابتدائی / درمیانہ / شدید",
  "confidence": 94,
  "cause": "پھپھوندی / بیکٹیریا / کیڑا اور سائنسی نام (Pathogen)",
  "symptoms_analysis": "پتوں پر سگار نما بھورے دھبے، پیلا ہالہ اور نچلے پتوں سے اوپر کی طرف پھیلاؤ",
  "emergency_action": "پہلا فوری قدم: نائٹروجن (یوریا) کھاد فوری روکیں اور کھیت میں پانی کھڑا نہ ہونے دیں",
  "treatment": "مرحلہ وار علاج اور سپرے کی مکمل فیلڈ ہدایات",
  "spray_conditions": "صبح 9 بجے سے پہلے یا عصر کے بعد سپرے کریں۔ تیز ہوا یا تیز دھوپ میں سپرے ہرگز نہ کریں۔",
  "fertilizer_adjustment": "یوریا کا استعمال فوری بند کریں۔ پوٹاش (SOP) کا سپرے پودے کے خلیات کو مضبوط کرے گا۔",
  "prevention": "1. بیماری سے پاک تصدیق شدہ بیج کاشت کریں۔\n2. بوائی سے پہلے بیج کو فنجی سائیڈ زہر لگائیں۔\n3. فصل کی کٹائی کے بعد باقیات کو زمین میں گہرا دبا دیں۔\n4. نائٹروجن اور پوٹاش کی متوازن مقدار دیں۔",
  "withholding_period_days": 21,
  "organic_alternative": "دیسی علاج: 5 ملی لیٹر نیم کا تیل اور 2 گرام سرف فی لیٹر پانی میں ملا کر 7 دن کے وقفے سے سپرے کریں۔ یا 10% کھٹی لسی کا چھڑکاؤ کریں۔",
  "medicines": [
    {
      "brand": "Nativo 75WG",
      "active": "Tebuconazole 50% + Trifloxystrobin 25%",
      "dosage": "80 تا 100 گرام فی ایکڑ",
      "tank_dosage_20l": "16 تا 20 گرام فی 20 لیٹر ڈرمکی (5 ڈرمکیاں فی ایکڑ)",
      "water_volume": "100-120 لیٹر پانی",
      "method": "فولیئر سپرے (کھوکھلی کون نوزل)",
      "withholding_period_days": 21,
      "suppliers": ["Bayer CropScience"],
      "estimated_price_pkr": "Rs. 1,900 - 2,400"
    }
  ]
}`;

      let parsed = null;
      let usedProvider = '';

      const withTimeout = (promise, ms = 12000, label = 'AI call') =>
        Promise.race([
          promise,
          new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms))
        ]);

      // --- Attempt A: Gemini Multimodal Vision ---
      if (gemini) {
        console.log(`[Tier-2 🤖 GEMINI VISION] Analyzing image with Gemini Vision...`);
        const geminiModels = ['gemini-3.6-flash', 'gemini-3.5-flash'];
        for (const gModel of geminiModels) {
          try {
            const geminiRes = await withTimeout(
              gemini.models.generateContent({
                model: gModel,
                contents: [
                  {
                    role: 'user',
                    parts: [
                      { text: systemPrompt + '\n\n' + promptText },
                      { inlineData: { mimeType: safeMime, data: imageBase64 } }
                    ]
                  }
                ],
                config: {
                  temperature: 0.2,
                  responseMimeType: 'application/json',
                  maxOutputTokens: 1400
                }
              }),
              12000,
              `Gemini ${gModel}`
            );

            const rawText = geminiRes.text || '';
            const m = rawText.match(/\{[\s\S]*\}/);
            if (m) {
              parsed = JSON.parse(m[0]);
              if (parsed && parsed.disease_ur) {
                usedProvider = `Gemini Vision (${gModel})`;
                db.logAIUsage({
                  endpoint: 'disease_vision',
                  provider: 'gemini',
                  model: gModel,
                  tokensIn:  geminiRes.usageMetadata?.promptTokenCount || 0,
                  tokensOut: geminiRes.usageMetadata?.candidatesTokenCount || 0,
                  cacheTokens: 0
                }).catch(() => {});
                break;
              }
            }
          } catch (gErr) {
            console.warn(`[Tier-2] Gemini model ${gModel} failed:`, gErr.status || gErr.message);
          }
        }
      }

      // --- Attempt B: Claude Multimodal Vision Fallback ---
      if (!parsed && claude) {
        console.log(`[Tier-2 🤖 CLAUDE VISION] Delegating to Claude Vision AI...`);
        const claudeModels = [CLAUDE_MODEL_VIS, 'claude-3-haiku-20240307'];
        for (const cModel of claudeModels) {
          try {
            const claudeRes = await withTimeout(
              claude.messages.create({
                model:      cModel,
                max_tokens: 1400,
                system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
                messages: [{
                  role: 'user',
                  content: [
                    { type: 'image', source: { type: 'base64', media_type: safeMime, data: imageBase64 } },
                    { type: 'text',  text: promptText }
                  ]
                }]
              }),
              12000,
              `Claude ${cModel}`
            );

            if (claudeRes?.usage) {
              db.logAIUsage({
                endpoint: 'disease_vision',
                provider: 'claude',
                model: cModel,
                tokensIn:    claudeRes.usage.input_tokens || 0,
                tokensOut:   claudeRes.usage.output_tokens || 0,
                cacheTokens: claudeRes.usage.cache_read_input_tokens || 0
              }).catch(() => {});
            }

            const textBlock = claudeRes.content?.find(b => b.type === 'text');
            const rawText = textBlock?.text ?? claudeRes.content?.[0]?.text ?? '';
            const m = rawText.match(/\{[\s\S]*\}/);
            if (m) {
              parsed = JSON.parse(m[0]);
              if (parsed && parsed.disease_ur) {
                usedProvider = `Claude Vision (${cModel})`;
                break;
              }
            }
          } catch (cErr) {
            console.warn(`[Tier-2] Claude model ${cModel} failed:`, cErr.status || cErr.message);
          }
        }
      }

      // --- Process Vision Result ---
      if (parsed && parsed.disease_ur) {
        const aiKey = (parsed.disease_en || tier1.disease_en || cropName || '')
          .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
        if (aiKey) {
          modelInference.saveToAgronomyDb(aiKey, parsed);
        }

        let parsedConf = typeof parsed.confidence === 'number'
          ? parsed.confidence
          : parseInt(parsed.confidence);
        if (isNaN(parsedConf) || parsedConf <= 0 || parsedConf > 100) {
          parsedConf = 93;
        }

        console.log(`[Tier-2 ✅ VISION SUCCESS] Provider: ${usedProvider} | Disease: "${parsed.disease_en}" (${parsed.disease_ur}) | Confidence: ${parsedConf}%`);

        const respData = {
          tier:                    2,
          source:                  'ai_vision',
          source_label:            '🟢 AI وژن تجزیہ',
          model_attribution:       `AI وژن تجزیہ (${usedProvider})`,
          confidence:              parsedConf,
          disease:                 `${parsed.disease_ur} (${parsed.disease_en || ''})`,
          disease_ur:              parsed.disease_ur,
          disease_en:              parsed.disease_en || '',
          disease_roman:           parsed.disease_roman || '',
          severity:                parsed.severity || 'درمیانہ',
          cause:                   parsed.cause || 'پھپھوندی / پاتھوجن',
          symptoms_analysis:       parsed.symptoms_analysis || '',
          emergency_action:        parsed.emergency_action || '',
          treatment:               parsed.treatment || 'مناسب پھپھوندی کش دوائی کا سپرے کریں۔',
          spray_conditions:        parsed.spray_conditions || 'صبح 9 بجے سے پہلے یا شام کے وقت سپرے کریں۔',
          fertilizer_adjustment:   parsed.fertilizer_adjustment || '',
          prevention:              parsed.prevention || 'کھیت صاف رکھیں اور متوازن کھاد دیں۔',
          withholding_period_days: parsed.withholding_period_days || 14,
          organic_alternative:     parsed.organic_alternative || 'دیسی علاج: نیم کا تیل 5 ملی لیٹر فی لیٹر پانی میں ملا کر سپرے کریں۔',
          medicines:               parsed.medicines || [],
          disclaimer:              'استعمال سے پہلے مقامی زرعی افسر سے تصدیق کروائیں۔'
        };

        // Non-blocking log to Questions tab
        db.saveChatLog({
          userId:    req.user?.id       || null,
          userName:  req.user?.name     || null,
          userPhone: req.user?.phone    || null,
          district:  req.user?.district || req.body?.district || null,
          question:  `[بیماری وژن] ${cropName || 'فصل'}: ${parsed.disease_ur}`,
          answer:    parsed.treatment || parsed.disease_ur,
          language:  'ur'
        }).catch(() => {});

        return res.json(respData);
      }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // TIER 3: SMART OFFLINE & BACKUP FALLBACK
    // Served when device is offline, image upload was unparseable, or Vision APIs unreachable.
    // ══════════════════════════════════════════════════════════════════════════
    console.log(`[Tier-3 📱 FALLBACK] Serving verified agronomy record for crop "${cropName || 'general'}"`);
    const fallbackConf = tier1.hasLocalRecord ? 82 : 70;

    return res.json({
      tier:                    3,
      source:                  'offline_fallback',
      source_label:            '📱 مقامی زرعی ریکارڈ (تصدیق ضروری)',
      model_attribution:       'مقامی زرعی ڈیٹابیس ریکارڈ',
      confidence:              fallbackConf,
      disease:                 tier1.disease || (cropName ? `${cropName} کی بیماری` : 'فصل کی بیماری'),
      disease_ur:              tier1.disease_ur || (cropName ? `${cropName} کی بیماری` : 'فصل کی بیماری'),
      disease_en:              tier1.disease_en || (cropName ? `${cropName} Disease` : 'Crop Disease'),
      disease_roman:           tier1.disease_roman || '',
      severity:                tier1.severity || 'درمیانہ',
      cause:                   tier1.cause || 'پھپھوندی / کیڑا (Pathogen)',
      symptoms_analysis:       tier1.symptoms_analysis || '',
      emergency_action:        tier1.emergency_action || 'فوری طور پر نائٹروجن (یوریا) کا استعمال روکیں اور نکاسی آب بہتر بنائیں',
      treatment:               tier1.treatment || 'بیماری کی علامات پر فوری قریبی زرعی دفتر یا ہیلپ لائن 0800-15000 سے رابطہ کریں۔',
      spray_conditions:        tier1.spray_conditions || 'صبح 9 بجے سے پہلے یا شام کے وقت سپرے کریں۔ تیز ہوا یا تیز دھوپ میں سپرے مت کریں۔',
      fertilizer_adjustment:   tier1.fertilizer_adjustment || 'یوریا کھاد کا استعمال فوری روکیں۔ پوٹاش (SOP) کا استعمال پودے کو بیماری سے بچاتا ہے۔',
      prevention:              tier1.prevention || 'کھیت صاف رکھیں، متوازن کھاد دیں اور نکاسی آب بہتر بنائیں۔',
      withholding_period_days: tier1.withholding_period_days || 14,
      organic_alternative:     tier1.organic_alternative || 'دیسی علاج: نیم کا تیل 5 ملی لیٹر فی لیٹر پانی میں ملا کر احتیاطی سپرے کریں۔',
      medicines:               tier1.medicines || [],
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

    const text = await geminiAsk(prompt + soilContextBlock, buildFarmingSystem(), 1200);

    // Log to Questions tab: prefix with tool name so admin knows which page
    if (text) {
      db.saveChatLog({
        userId:    req.user?.id       || null,
        userName:  req.user?.name     || null,
        userPhone: req.user?.phone    || null,
        district:  req.user?.district || req.body?.district || null,
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

    // ——— Farmer profile context injection (میرا فارم) ———
    let farmerProfileCtx = '';
    if (req.user?.id) {
      try {
        const fp = await db.getFarmerProfile(req.user.id);
        farmerProfileCtx = db.buildFarmerContext(fp);
      } catch {} // Silent — never delay stream for profile fetch
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

    const chatSystemText = buildChatSystem(language) + contextBlock + farmerProfileCtx;

    // ─── Stream with Gemini (primary) or Claude (failover) ──────────────────────
    let fullReply = '';
    let finalMsg = null;

    if (gemini) {
      // ── Gemini SSE Streaming (primary) ──
      try {
        const sysText = chatSystemText;
        const contents = [];
        for (const m of claudeMessages) {
          const role = m.role === 'assistant' ? 'model' : 'user';
          const text = m.content || '';
          if (!text) continue;
          if (contents.length > 0 && contents[contents.length - 1].role === role) {
            contents[contents.length - 1].parts[0].text += '\n' + text;
          } else {
            contents.push({ role, parts: [{ text }] });
          }
        }
        if (contents.length === 0 || contents[contents.length - 1].role !== 'user') {
          contents.push({ role: 'user', parts: [{ text: lastMsg?.content || 'سلام' }] });
        }

        const stream = await gemini.models.generateContentStream({
          model: GEMINI_MODEL,
          contents,
          config: { maxOutputTokens: 1500, temperature: 0.65, systemInstruction: sysText }
        });
        for await (const chunk of stream) {
          if (req.destroyed || res.writableEnded) break;
          const text = chunk.text || chunk.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (text) {
            fullReply += text;
            res.write(`data: ${JSON.stringify({ text })}\n\n`);
          }
        }
        if (fullReply) {
          const promptEst = Math.ceil(((chatSystemText?.length || 0) + (lastMsg?.content?.length || 0)) / 3.5);
          const outEst = Math.ceil(fullReply.length / 3.5);
          db.logAIUsage({
            endpoint: 'chat_stream',
            provider: 'gemini',
            model: GEMINI_MODEL,
            tokensIn: promptEst,
            tokensOut: outEst,
            cacheTokens: 0
          }).catch(() => {});
        }
      } catch (geminiErr) {
        console.warn('[Gemini Stream] Error — falling back to Claude:', geminiErr.message);
        if (claude && !req.destroyed && !res.writableEnded) {
          const fallbackStream = claude.messages.stream({
            model: CLAUDE_MODEL, max_tokens: 1500, temperature: 0.65,
            system: [{ type: 'text', text: chatSystemText, cache_control: { type: 'ephemeral' } }],
            messages: claudeMessages
          });
          fallbackStream.on('text', (text) => {
            if (req.destroyed || res.writableEnded) {
              try { fallbackStream.abort(); } catch {}
              return;
            }
            if (text) { fullReply += text; res.write(`data: ${JSON.stringify({ text })}\n\n`); }
          });
          fallbackStream.on('error', (streamErr) => {
            console.warn('[Claude Fallback Stream] Error:', streamErr.message);
          });
          finalMsg = await fallbackStream.finalMessage().catch(() => null);
        }
      }
    } else if (claude) {
      // ── Claude fallback (no Gemini configured) ──
      const stream = claude.messages.stream({
      model: CLAUDE_MODEL,
      max_tokens: 1500,
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
    // Non-blocking token tracking for Claude (fire and forget)
    if (finalMsg?.usage) {
      db.logAIUsage({
        endpoint: 'chat_stream',
        provider: 'claude',
        model: CLAUDE_MODEL,
        tokensIn:    finalMsg.usage.input_tokens || 0,
        tokensOut:   finalMsg.usage.output_tokens || 0,
        cacheTokens: finalMsg.usage.cache_read_input_tokens || 0
      }).catch(() => {});
    }
    if (heartbeat) clearInterval(heartbeat);
    if (!res.writableEnded) {
      // If stream was empty due to provider lag, fetch non-streaming answer so user is never left without response
      if (!fullReply) {
        try {
          const emergencyAnswer = await geminiAsk(lastMsg?.content || 'سلام', chatSystemText, 1500);
          if (emergencyAnswer) {
            fullReply = emergencyAnswer;
            res.write(`data: ${JSON.stringify({ text: emergencyAnswer })}\n\n`);
          }
        } catch {}
      }
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
        userId:    req.user?.id       || null,
        userName:  req.user?.name     || null,
        userPhone: req.user?.phone    || null,
        district:  req.user?.district || req.body?.district || null,
        question:  lastMsg.content,
        answer:    fullReply,
        language
      }).catch(() => {});
    }

    // میرا فارم: passive extraction (non-blocking, fire-and-forget)
    // Only extract if user is authenticated and sent a message
    if (req.user?.id && lastMsg.role === 'user' && fullReply) {
      (async () => {
        try {
          const text = lastMsg.content;
          const CROP_NAMES = ['گندم','کپاس','چاول','مکئی','گنا','کماد','آلو','سرسوں','چنا','مونگ','بھینس','گائے','بکری','مرغی','دودھ','لیٹر','ایکڑ'];
          // Quick check: only call extraction if message likely contains farm facts
          if (CROP_NAMES.some(kw => text.includes(kw))) {
            const token = require('../middleware/auth').signToken(req.user);
            // Internal call to extract endpoint — lightweight regex, no AI cost
            const http = require('http');
            // Use direct function call instead of HTTP to avoid overhead
            const fp = await db.getFarmerProfile(req.user.id);
            const existing = fp || { crops: [], livestock: [], spray_log: [], soil: {}, notes: '' };
            
            // Inline mini-extraction (same logic as farmerProfile.js /extract)
            const extracted = { crops: [], livestock: [] };
            let hasData = false;
            
            // Crop+acres patterns
            const m1 = text.match(/(\d+(?:\.\d+)?)\s*(?:ایکڑ|acre)\s+([\u0600-\u06FF]+)/i);
            if (m1) { extracted.crops.push({ name: m1[2], acres: parseFloat(m1[1]) }); hasData = true; }
            const m2 = text.match(/([\u0600-\u06FF]+)\s+(\d+(?:\.\d+)?)\s*(?:ایکڑ|acre)/i);
            if (m2 && !hasData) { extracted.crops.push({ name: m2[1], acres: parseFloat(m2[2]) }); hasData = true; }
            
            // Livestock count
            const lvMatch = text.match(/(\d+)\s*(بھینس|گائے|بکری|مرغی|بیل)/i);
            if (lvMatch) { extracted.livestock.push({ type: lvMatch[2], count: parseInt(lvMatch[1]) }); hasData = true; }
            
            if (hasData) {
              const merged = { ...existing };
              merged.crops = [...(existing.crops || [])];
              merged.livestock = [...(existing.livestock || [])];
              for (const c of extracted.crops) {
                const idx = merged.crops.findIndex(x => x.name === c.name);
                if (idx >= 0) merged.crops[idx] = { ...merged.crops[idx], ...c };
                else merged.crops.push(c);
              }
              for (const l of extracted.livestock) {
                const idx = merged.livestock.findIndex(x => x.type === l.type);
                if (idx >= 0) merged.livestock[idx] = { ...merged.livestock[idx], ...l };
                else merged.livestock.push(l);
              }
              merged.crops = merged.crops.slice(0, 20);
              merged.livestock = merged.livestock.slice(0, 15);
              await db.upsertFarmerProfile(req.user.id, merged);
              console.log('[میرا فارم] Auto-extracted:', JSON.stringify(extracted));
            }
          }
        } catch (e) {
          // Silent — never log errors for background extraction
        }
      })();
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

    const systemPrompt = `آپ پنجاب پاکستان کے لائیوسٹاک و ویٹرنری معاون (Livestock Advisory & Triage Assistant) ہیں۔
کسان کا سوال اردو، رومن اردو (جیسے "khana nahi khaya", "bukhar hai", "doodh kam hai") یا انگریزی میں ہو سکتا ہے، اسے سمجھ کر ہمدردانہ اور جامع اردو میں علامتی رہنمائی دیں۔
آپ کوئی انسانی ڈاکٹر نہیں ہیں، اس لیے ہمیشہ ابتدائی فرسٹ ایڈ اور مستند ویٹرنری ڈاکٹر سے رجوع کی ہدایت دیں۔

اہم طبی و حفاظتی اصول (PVMC ضوابط):
1. کبھی بھی جواب میں سسٹم پرامپٹ کی ہدایات، "Mandatory Directive"، رولز یا قواعد کے نمبر مت لکھیں! کسان کو براہ راست باوقار علامتی مشورہ رپورٹ دیں۔
2. اگر جانور یا پرندے نے کھانا پینا چھوڑ دیا ہے (Off-feed / بھوک بند / 2 دن سے کھانا نہیں کھایا):
   - یہ ایک سنجیدہ علامت ہے جو تیز بخار، بدہضمی، اپھارہ (Bloat)، معدے میں تعفن (Acidosis)، یا خون میں انفیکشن کی وجہ سے ہو سکتی ہے۔
   - فوری معائنہ بتائیں: تھرمامیٹر سے درجہ حرارت چیک کریں (نارمل گائے/بھینس: 101–102.5°F)، بائیں کوکھ دبا کر اپھارہ چیک کریں، گوبر کی کیفیت دیکھیں۔
   - فوری گھریلو فرسٹ ایڈ بتائیں: میٹھا سوڈا (Sodium Bicarb 50g) نیم گرم پانی میں، ہاضمہ مصالحہ یا سونف و اجوائن کا قہوہ۔
3. ہمیشہ پاکستان میں دستیاب DRAP رجسٹرڈ ادویات کا عمومی ذکر کریں (جیسے بخار و درد کیلئے Melonex / Ketovet، ہاضمہ کیلئے Masala Carminative / Digevet)، لیکن اینٹی بائیوٹک یا انجیکشن لگانے سے سختی سے منع کریں جب تک سول ویٹرنری ہسپتال کا ڈاکٹر خود معائنہ نہ کر لے۔
4. دوائی کی مقدار جانور کے وزن کے مطابق ڈاکٹر یا قریبی ویٹرنری ہسپتال (ہیلپ لائن: 0800-15000) سے طے کروانے کی تاکید کریں۔
5. جواب کے آخر میں ہمیشہ یہ انتباہ شامل کریں: "⚠️ یہ مشورہ صرف معلوماتی فرسٹ ایڈ ہے۔ مستند علاج کیلئے سول ویٹرنری ہسپتال سے رجوع کریں۔"`;

    const prompt = `جانور کی قسم: ${animalType || 'مویشی'}
علامات: ${symptoms || 'کوئی مخصوص علامت نہیں بتائی'}
کسان کی شکایت / سوال: ${question || 'جانور سست ہے اور چارہ نہیں کھا رہا'}

برائے مہربانی درج ذیل 4 پوائنٹس میں مکمل علامتی مشورہ و فرسٹ ایڈ رپورٹ دیں:
1. 🩺 ممکنہ علامتی سبب (کھانا نہ کھانے کی وجوہات)
2. 🌡️ فوری گھریلو معائنہ (بخار، اپھارہ، گوبر/پیشاب)
3. 💊 فوری ابتدائی فرسٹ ایڈ و DRAP برانڈز کی عمومی معلومات
4. 🏥 سول ویٹرنری ہسپتال (CVH) ریفرل و لائیوسٹاک ہیلپ لائن (0800-15000)

سلیس، آسان اور کسان فہم اردو میں جواب دیں۔`;

    const text = await geminiAsk(prompt, systemPrompt, 1200);

    // Log to Questions tab: prefix with tool name
    if (text) {
      db.saveChatLog({
        userId:    req.user?.id       || null,
        userName:  req.user?.name     || null,
        userPhone: req.user?.phone    || null,
        district:  req.user?.district || req.body?.district || null,
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

    // ── UVAS/L&DD Punjab Veterinary System Prompt (Advisory & Triage) ────────
    const systemPrompt = `آپ پاکستان میں University of Veterinary and Animal Sciences (UVAS) لاہور اور محکمہ لائیوسٹاک پنجاب (L&DD) کے پروٹوکول پر مبنی ایک لائیوسٹاک معاون AI (Livestock Triage Assistant) ہیں۔
آپ کی واحد ذمہ داری یہ ہے: تصویر میں نظر آنے والی ظاہری علامات کی بنیاد پر علامتی معائنہ، فرسٹ ایڈ تجاویز اور سول ویٹرنری ہسپتال (CVH) ریفرل رہنمائی دینا۔ آپ انسانی ڈاکٹر نہیں ہیں۔

بصری معائنے کا دائرہ کار (صرف ان علامات کا تجزیہ کریں جو تصویر میں واضح نظر آئیں):
- ساڑو / تھن کی سوجن (Mastitis)
- لمپی سکن / چمبل / داد (LSD, Mange, Ringworm)
- کھر گلنا / منہ کھر کے چھالے (Foot Rot, FMD Blisters)
- منہ / مسوڑھوں کے چھالے (Oral Ulcers)
- آنکھ کی سوزش / دھندلا پن (Pinkeye / Keratoconjunctivitis)
- کھلے زخم / کیڑے / پھوڑے (Wounds, Myiasis, Abscess)

سخت طبی ضوابط (PVMC قوانین کے تحت):
1. کوئی نسخہ انجیکشن نہ لکھیں (Antibiotics IV/IM, Corticosteroids, Oxytocin ممنوع ہیں)
2. صرف DRAP منظور شدہ بیرونی ادویات تجویز کریں: پوویڈون آیوڈین (Betadine)، پوٹاشیم پرمینگنیٹ (گلابی نمک)، زنک آکسائیڈ مرہم، نیم تیل، کیروسین
3. حاملہ جانور کیلئے Dexamethasone اور PGF2-alpha ہرگز ذکر نہ کریں
4. اگر تصویر میں کچھ واضح نہ ہو تو لکھیں: "تصویر واضح نہیں — متاثرہ حصہ قریب سے دوبارہ تصویر لیں"
5. ہر جواب میں سول ویٹرنری ہسپتال اور 0800-15000 ہیلپ لائن کا ذکر لازمی کریں

جواب کا فارمیٹ (صرف JSON):
{
  "visualObservation": "تصویر میں کیا نظر آ رہا ہے (اردو میں)",
  "suspectedCondition": "ممکنہ علامتی بیماری کا نام (اردو + English)",
  "urgency": "URGENT" | "WARNING" | "MILD",
  "confidence": "85%",
  "immediateFirstAid": ["پہلا قدم", "دوسرا قدم", "تیسرا قدم"],
  "pregnancySafeNote": "حاملہ جانور کیلئے خصوصی ہدایت (اگر ضروری ہو)",
  "withdrawalPeriod": { "milk": "72 گھنٹے دودھ نہ بیچیں", "meat": "14 دن" },
  "doctorRecommendation": "سول ویٹرنری ہسپتال (CVH) سے رجوع اور 0800-15000 ہیلپ لائن"
}`;

    const userMessage = `جانور کی قسم: ${animalType}
متاثرہ حصہ: ${bodyRegion}
${pregnancyNote}
${feverNote}
${feedNote}
${weightNote}

براہ کرم منسلک تصویر دیکھ کر بصری علامتی معائنہ کریں اور JSON فارمیٹ میں جواب دیں۔`;

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

    if (response?.usage) {
      db.logAIUsage({
        endpoint: 'animal_vision',
        provider: 'claude',
        model: CLAUDE_MODEL_VIS,
        tokensIn:    response.usage.input_tokens || 0,
        tokensOut:   response.usage.output_tokens || 0,
        cacheTokens: response.usage.cache_read_input_tokens || 0
      }).catch(() => {});
    }

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
      userId:    req.user?.id       || null,
      userName:  req.user?.name     || null,
      userPhone: req.user?.phone    || null,
      district:  req.user?.district || req.body?.district || null,
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
