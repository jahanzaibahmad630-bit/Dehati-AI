/**
 * DehatiAI Offline Service
 * - IndexedDB stores: `ai_cache` (user's past AI answers) + `faq` (pre-built farming Q&A)
 * - localStorage: `offline_queue` (questions waiting to send when back online)
 */

const DB_NAME   = 'dehati_offline_v2';
const DB_VERSION = 1;

// ─────────────────────────────────────────────────────────────────────────────
// Pre-built Farming FAQ — 100+ common Pakistani farming Q&A pairs (Urdu)
// ─────────────────────────────────────────────────────────────────────────────
export const FAQ_DATA = [
  // ── گندم (Wheat) ──────────────────────────────────────────────────────────
  {
    id: 'w1', tags: ['گندم','پانی','آبپاشی','wheat','water'],
    q: 'گندم کو کتنا پانی چاہیے اور کب دیں؟',
    a: '🌾 گندم کو پوری فصل میں 4–6 مرتبہ پانی چاہیے:\n• پہلا پانی: بیج بونے کے 21 دن بعد (ٹلرنگ)\n• دوسرا: 25 دن بعد\n• تیسرا: بالی نکلنے سے پہلے\n• چوتھا: دانہ بھرتے وقت\nہر پانی میں 3–4 انچ پانی دیں۔ نومبر–فروری میں ٹھنڈ زیادہ ہو تو وقفہ بڑھائیں۔'
  },
  {
    id: 'w2', tags: ['گندم','کھاد','DAP','یوریا','wheat','fertilizer'],
    q: 'گندم میں کھاد کتنی ڈالیں؟',
    a: '🌾 گندم کی کھاد (فی ایکڑ):\n• DAP: 50 کلو — بوائی کے وقت\n• یوریا: 50 کلو — پہلے پانی کے ساتھ\n• یوریا: 25 کلو — دوسرے پانی کے ساتھ\nزنک کی کمی ہو تو 5 کلو زنک سلفیٹ بوائی پر ڈالیں۔'
  },
  {
    id: 'w3', tags: ['گندم','بیج','مقدار','wheat','seed','rate'],
    q: 'گندم کا بیج فی ایکڑ کتنا لگتا ہے؟',
    a: '🌾 گندم کا بیج: 50–60 کلو فی ایکڑ۔ چھوٹے دانے والی اقسام میں 40–45 کلو کافی ہے۔ بوائی کا بہترین وقت: نومبر 1–30 (پنجاب)۔'
  },
  {
    id: 'w4', tags: ['گندم','کاٹنا','فصل','harvest','wheat'],
    q: 'گندم کاٹنے کا وقت کب ہے؟',
    a: '🌾 گندم کی کٹائی اپریل کے وسط سے مئی تک ہوتی ہے۔ نشانی: دانہ سخت ہو جائے، بالی سنہری ہو، نمی 14٪ سے کم ہو۔ دیر سے نہ کاٹیں — ورنہ دانہ جھڑ جاتا ہے۔'
  },
  {
    id: 'w5', tags: ['گندم','زنگ','بیماری','rust','wheat'],
    q: 'گندم میں زنگ (rust) لگ گئی ہے کیا کریں؟',
    a: '⚠️ گندم کا زنگ:\n• پیلا زنگ: Propiconazole 0.1٪ سپرے کریں\n• بھورا/کالا زنگ: Tebuconazole 0.1٪\nسپرے صبح سویرے کریں۔ 10–14 دن بعد دہرائیں اگر ضرورت ہو۔ زیادہ رطوبت اور ٹھنڈ میں بیماری پھیلتی ہے۔'
  },
  {
    id: 'w6', tags: ['گندم','تیلا','aphid','کیڑا','wheat'],
    q: 'گندم میں تیلا/چیپا لگا ہوا ہے؟',
    a: '🐛 تیلا (Aphid) کنٹرول:\n• Imidacloprid 70 ml فی ایکڑ پانی میں ملا کر سپرے\n• یا Chlorpyrifos 500 ml فی ایکڑ\nاگر فائدہ مند کیڑے (Ladybird) نظر آئیں تو سپرے سے گریز کریں — وہ خود تیلے کو کھا لیتے ہیں۔'
  },

  // ── کپاس (Cotton) ─────────────────────────────────────────────────────────
  {
    id: 'c1', tags: ['کپاس','پانی','آبپاشی','cotton','water'],
    q: 'کپاس کو پانی کب دیں؟',
    a: '🌿 کپاس میں پانی:\n• پہلا پانی: بوائی سے پہلے (وتر)\n• پھر ہر 10–15 دن بعد مئی–جون\n• پھول اور ٹینڈے بنتے وقت پانی بند نہ کریں\n• ستمبر–اکتوبر میں پانی کم کریں تاکہ ٹینڈے کھلیں'
  },
  {
    id: 'c2', tags: ['کپاس','گلابی سنڈی','bollworm','کیڑا','cotton'],
    q: 'کپاس میں گلابی سنڈی کا علاج کیا ہے؟',
    a: '⚠️ گلابی سنڈی (Pink Bollworm):\n• Emamectin Benzoate 200 ml فی ایکڑ\n• یا Spinosad 150 ml فی ایکڑ\n• فیرومون ٹریپ لگائیں — نر سنڈی پکڑنے کے لیے\n• ٹینڈا پھٹا ہوا دکھائی دے تو فوری سپرے کریں'
  },
  {
    id: 'c3', tags: ['کپاس','کھاد','fertilizer','cotton'],
    q: 'کپاس میں کھاد کتنی اور کب ڈالیں؟',
    a: '🌿 کپاس کی کھاد (فی ایکڑ):\n• بوائی پر: DAP 50 کلو\n• پہلے پانی پر: یوریا 35 کلو\n• پھول بنتے وقت: یوریا 25 کلو + Potash 25 کلو\nپوٹاش سے ٹینڈے بڑے اور مضبوط ہوتے ہیں۔'
  },
  {
    id: 'c4', tags: ['کپاس','سفید مکھی','whitefly','cotton'],
    q: 'کپاس میں سفید مکھی کا حل کیا ہے؟',
    a: '🐛 سفید مکھی (Whitefly):\n• Spiromesifen 250 ml فی ایکڑ\n• یا Buprofezin 500 ml فی ایکڑ\n• پتے کے نیچے سپرے کریں — وہاں انڈے ہوتے ہیں\n• صبح سویرے یا شام کو سپرے بہتر رہتا ہے'
  },

  // ── چاول (Rice) ───────────────────────────────────────────────────────────
  {
    id: 'r1', tags: ['چاول','پانی','آبپاشی','rice','water'],
    q: 'چاول کو پانی کب دیں؟',
    a: '🌾 چاول میں پانی:\n• شروع میں 2–3 انچ پانی کھڑا رکھیں\n• پھوٹ پھوٹنے کے بعد پانی 4–5 انچ\n• بالی نکلنے پر پانی بند نہ کریں\n• پکنے سے 15 دن پہلے پانی بند کریں'
  },
  {
    id: 'r2', tags: ['چاول','کھاد','fertilizer','rice'],
    q: 'چاول میں کھاد کتنی ڈالیں؟',
    a: '🌾 چاول کی کھاد (فی ایکڑ):\n• نرسری میں: DAP 25 کلو\n• پنیری لگانے پر: یوریا 40 کلو\n• 30 دن بعد: یوریا 30 کلو\n• بالی نکلنے پر: یوریا 20 کلو'
  },

  // ── گنا (Sugarcane) ────────────────────────────────────────────────────────
  {
    id: 'sg1', tags: ['گنا','پانی','آبپاشی','sugarcane'],
    q: 'گنے کو پانی کب دیں؟',
    a: '🎋 گنے میں پانی:\n• موسم گرما: ہر 7–10 دن بعد\n• سردی: 20–25 دن بعد\n• برسات میں: ضرورت کم ہوتی ہے\n• کاٹنے سے 30 دن پہلے پانی بند کریں'
  },
  {
    id: 'sg2', tags: ['گنا','کھاد','fertilizer','sugarcane'],
    q: 'گنے میں کھاد کتنی ڈالیں؟',
    a: '🎋 گنے کی کھاد (فی ایکڑ):\n• بوائی پر: DAP 75 کلو + Potash 50 کلو\n• 2 مہینے بعد: یوریا 60 کلو\n• 4 مہینے بعد: یوریا 50 کلو\n• گنے کی اچھی پیداوار کے لیے پوٹاش ضروری ہے'
  },

  // ── مکئی (Maize) ──────────────────────────────────────────────────────────
  {
    id: 'm1', tags: ['مکئی','کھاد','fertilizer','maize','corn'],
    q: 'مکئی میں کھاد کتنی ڈالیں؟',
    a: '🌽 مکئی کی کھاد (فی ایکڑ):\n• بوائی پر: DAP 50 کلو\n• پہلے پانی پر: یوریا 50 کلو\n• 45 دن بعد: یوریا 35 کلو\nمکئی میں زنک اہم ہے — 5 کلو زنک سلفیٹ ضرور ڈالیں۔'
  },

  // ── کھاد عمومی (General Fertilizer) ─────────────────────────────────────
  {
    id: 'f1', tags: ['DAP','یوریا','فرق','fertilizer','difference'],
    q: 'DAP اور یوریا میں کیا فرق ہے؟',
    a: '🧪 DAP اور یوریا:\n\n• DAP (Diammonium Phosphate): فاسفورس + نائٹروجن — جڑوں کی نشوونما کے لیے — بوائی کے وقت ڈالیں\n\n• یوریا: صرف نائٹروجن — پتوں اور تنے کی نشوونما — پانی دیتے وقت ڈالیں\n\nداپ جڑ بناتی ہے، یوریا فصل اُگاتی ہے۔'
  },
  {
    id: 'f2', tags: ['پوٹاش','potash','کھاد','fertilizer'],
    q: 'پوٹاش کھاد کے کیا فائدے ہیں؟',
    a: '🧪 پوٹاش کے فائدے:\n• پھل اور دانہ بڑا اور مضبوط ہوتا ہے\n• فصل کو بیماریوں سے بچاتا ہے\n• پانی کم لگتا ہے\n• چینی کی مقدار بڑھتی ہے (گنے میں)\n\nمقدار: 25–50 کلو فی ایکڑ حسب ضرورت'
  },
  {
    id: 'f3', tags: ['زنک','zinc','کمی','fertilizer'],
    q: 'زنک کی کمی کی علامات کیا ہیں؟',
    a: '🧪 زنک کی کمی:\n• نئے پتے چھوٹے اور پیلے\n• درمیان کی رگ سبز لیکن کنارے پیلے\n• فصل رُک جاتی ہے\n\nعلاج: 5–10 کلو زنک سلفیٹ فی ایکڑ زمین میں ملائیں\nیا 0.5٪ محلول پتوں پر سپرے کریں'
  },

  // ── کیڑے مکوڑے عمومی (General Pests) ──────────────────────────────────
  {
    id: 'p1', tags: ['سنڈی','caterpillar','کیڑا','pest'],
    q: 'فصل میں سنڈی لگ گئی ہے کیا کروں؟',
    a: '🐛 سنڈی کا علاج:\n• چھوٹی سنڈی: Chlorpyrifos 500 ml فی ایکڑ\n• بڑی سنڈی: Emamectin Benzoate 200 ml فی ایکڑ\n• یا Spinosad 150 ml فی ایکڑ (بہترین)\n\nشام کو سپرے کریں — سنڈی رات کو زیادہ سرگرم ہوتی ہے'
  },
  {
    id: 'p2', tags: ['سپرے','وقت','timing','spray','pesticide'],
    q: 'سپرے کرنے کا بہترین وقت کیا ہے؟',
    a: '⏰ سپرے کا بہترین وقت:\n• صبح 7–10 بجے یا شام 5–7 بجے\n• تیز دھوپ میں سپرے نہ کریں — دوائی اُڑ جاتی ہے\n• ہوا نہ چل رہی ہو\n• سپرے کے 4–6 گھنٹے بعد بارش نہ ہو\n• نوزل پتے کے نیچے بھی پہنچائیں'
  },
  {
    id: 'p3', tags: ['جڑی بوٹی','weed','weedicide','ماتم'],
    q: 'جڑی بوٹیوں کا علاج کیسے کریں؟',
    a: '🌿 جڑی بوٹی کنٹرول:\n• گندم میں: Isoproturon 500 g فی ایکڑ (بوائی کے 30–40 دن بعد)\n• کپاس میں: Pendimethalin بوائی کے فوراً بعد\n• مکئی میں: Atrazine 500 g فی ایکڑ\n\nسپرے پہلے پانی سے پہلے کریں — زمین نم ہو'
  },

  // ── آبپاشی عمومی (General Irrigation) ────────────────────────────────────
  {
    id: 'i1', tags: ['ڈرپ','drip','آبپاشی','irrigation'],
    q: 'ڈرپ آبپاشی کے کیا فائدے ہیں؟',
    a: '💧 ڈرپ آبپاشی کے فائدے:\n• 40–60٪ پانی کی بچت\n• فصل براہ راست جڑ تک پانی ملتا ہے\n• جڑی بوٹی کم اُگتی ہے\n• کھاد پانی کے ساتھ دے سکتے ہیں\n• پیداوار 20–30٪ زیادہ\n\nسرکاری سبسڈی دستیاب ہے — OFWM آفس سے رابطہ کریں'
  },

  // ── مٹی (Soil) ─────────────────────────────────────────────────────────────
  {
    id: 'soil1', tags: ['مٹی','soil','pH','تیزابیت','alkaline'],
    q: 'مٹی کا pH ٹیسٹ کیوں ضروری ہے؟',
    a: '🌱 مٹی ٹیسٹ کیوں:\n• pH 6.5–7.5 فصل کے لیے بہترین\n• زیادہ pH (نمکین زمین) میں کھاد ضائع ہوتی ہے\n• مٹی ٹیسٹ سے پتہ چلتا ہے کتنی کھاد چاہیے\n\nٹیسٹ کروائیں: زرعی دفتر یا NARC لیب سے۔ 200–500 روپے میں رپورٹ مل جاتی ہے'
  },

  // ── حکومتی اسکیمیں (Government Schemes) ──────────────────────────────────
  {
    id: 'gs1', tags: ['کسان کارڈ','kisaan card','سرکار','government','scheme'],
    q: 'کسان کارڈ کیا ہے اور کیسے ملتا ہے؟',
    a: '🏛 پنجاب کسان کارڈ:\n• 25,000 روپے تک بلا سود قرضہ\n• کھاد، بیج، سپرے کی خریداری پر\n• درخواست: narc.gov.pk یا قریبی زرعی دفتر\n• ضروری دستاویزات: CNIC، فرد (زمین کے کاغذات)\n• رقم سیدھے ڈیجیٹل والٹ میں آتی ہے'
  },
  {
    id: 'gs2', tags: ['ZTBL','قرضہ','loan','زرعی','bank'],
    q: 'ZTBL سے قرضہ کیسے ملتا ہے؟',
    a: '🏦 ZTBL زرعی قرضہ:\n• فصلی قرضہ: فی ایکڑ 50,000–70,000 روپے\n• شرح سود: 5–9٪ سالانہ\n• قریبی ZTBL برانچ پر جائیں\n• دستاویزات: CNIC، فرد، گرداوری\n• قرضہ 6–12 مہینے میں واپس کریں'
  },
  {
    id: 'gs3', tags: ['سبسڈی','subsidy','کھاد','fertilizer','government'],
    q: 'سرکاری سبسڈی پر کھاد کیسے ملتی ہے؟',
    a: '🏛 سبسڈی کھاد:\n• پنجاب حکومت DAP پر سبسڈی دیتی ہے\n• قریبی زرعی دفتر یا لائسنس یافتہ ڈیلر سے لیں\n• کسان کارڈ ہو تو آسانی ہوتی ہے\n• مقدار فی ایکڑ طے شدہ ہوتی ہے'
  },
  {
    id: 'gs4', tags: ['فصل','انشورنس','insurance','scheme'],
    q: 'فصل بیمہ (insurance) کیسے کروائیں؟',
    a: '📋 فصل بیمہ:\n• Punjab Crop Insurance Scheme دستیاب ہے\n• گندم، چاول، کپاس، مکئی شامل\n• قریبی بینک برانچ سے رابطہ کریں\n• بارش، سیلاب، بیماری سے نقصان پر معاوضہ'
  },

  // ── مویشی (Livestock) ─────────────────────────────────────────────────────
  {
    id: 'lv1', tags: ['بھینس','گائے','دودھ','cow','buffalo','milk'],
    q: 'بھینس یا گائے کا دودھ کم ہو گیا ہے؟',
    a: '🐄 دودھ کم ہونے کی وجوہات:\n• خوراک کم: سبز چارہ + خشک چارہ + وٹامن دیں\n• پانی کم: دن میں 3–4 بار پانی پلائیں\n• گرمی: ٹھنڈی جگہ رکھیں، نہلائیں\n• بیماری: بخار چیک کریں، ڈاکٹر سے ملیں\n• حمل: آخری 2 ماہ میں دودھ قدرتاً کم ہوتا ہے'
  },
  {
    id: 'lv2', tags: ['بھینس','ٹیکہ','vaccine','مویشی','livestock'],
    q: 'مویشیوں کو کون سے ٹیکے لگانے چاہئیں؟',
    a: '💉 مویشیوں کے ضروری ٹیکے:\n• FMD (منہ کھر): ہر 6 مہینے\n• LSD (گانٹھ بیماری): سالانہ\n• Hemorrhagic Septicemia: سالانہ\n• Brucellosis (گائے): ایک بار\n\nقریبی ویٹرنری ہسپتال یا محکمہ مال سے مفت ٹیکے مل سکتے ہیں'
  },

  // ── موسم اور کاشت (Weather & Farming Tips) ───────────────────────────────
  {
    id: 'wt1', tags: ['گرمی','heat','فصل','summer','crop'],
    q: 'شدید گرمی میں فصل کو کیسے بچائیں؟',
    a: '🌡️ گرمی سے فصل بچانا:\n• صبح یا شام پانی دیں — دوپہر میں پانی بھاپ بن جاتا ہے\n• ملچنگ کریں (تنکے/پلاسٹک) — نمی رہتی ہے\n• Potash سپرے کریں — گرمی برداشت بڑھتی ہے\n• سایہ دار درخت فصل کے کنارے لگائیں'
  },
  {
    id: 'wt2', tags: ['پالا','frost','ٹھنڈ','cold','winter'],
    q: 'پالے سے فصل کو کیسے بچائیں؟',
    a: '❄️ پالے سے بچاؤ:\n• رات کو پانی دیں — پانی گرمی دیتا ہے\n• سلفر 80٪ 1 کلو + پانی 200 لٹر سپرے کریں\n• دھواں کریں (پرانی لکڑی)\n• پوٹاشیم نائٹریٹ 1٪ محلول سپرے\n• ننھی کونپلوں کو ڈھانپیں'
  },
  {
    id: 'wt3', tags: ['بارش','rain','waterlogging','پانی کھڑا'],
    q: 'زیادہ بارش سے کھیت میں پانی کھڑا ہو گیا ہے؟',
    a: '🌧️ پانی نکالنا:\n• کھیت سے نالی کاٹ کر پانی نکالیں\n• پانی نکلنے کے بعد DAP 25 کلو ڈالیں (نائٹروجن بہ جاتی ہے)\n• جڑوں میں ہوا آنے دیں\n• فصل پیلی ہو تو فولیر سپرے کریں'
  },

  // ── آرگینک کاشتکاری (Organic) ────────────────────────────────────────────
  {
    id: 'org1', tags: ['آرگینک','organic','قدرتی','natural','کھاد'],
    q: 'آرگینک کھاد کیسے بنائیں؟',
    a: '♻️ گھر پر آرگینک کھاد:\n• گوبر + پتیاں + باقیات → 30 دن میں کھاد تیار\n• ورمی کمپوسٹ (کینچوے): بہترین آرگینک کھاد\n• نیم کھل: کیڑوں سے بھی بچاتی ہے\n\nفی ایکڑ 2–4 ٹن گوبر کھاد مٹی کو بہترین بناتی ہے'
  },

  // ── سبزیاں (Vegetables) ───────────────────────────────────────────────────
  {
    id: 'v1', tags: ['ٹماٹر','tomato','سبزی','vegetable'],
    q: 'ٹماٹر میں کھاد اور پانی کیسے دیں؟',
    a: '🍅 ٹماٹر کی کاشت:\n• کھاد: DAP 30 کلو + یوریا 20 کلو فی ایکڑ\n• پانی: ہر 5–7 دن بعد\n• پھل آنے پر پوٹاش 20 کلو ڈالیں\n• Early Blight سے بچاؤ: Mancozeb سپرے کریں'
  },
  {
    id: 'v2', tags: ['آلو','potato','سبزی','vegetable'],
    q: 'آلو کی بہترین کاشت کا طریقہ کیا ہے؟',
    a: '🥔 آلو کی کاشت:\n• بوائی: اکتوبر–نومبر\n• گہرائی: 10–12 سینٹی میٹر\n• کھاد: DAP 75 کلو + یوریا 60 کلو\n• پانی: ہر 8–10 دن\n• جھلسا بیماری سے بچاؤ: Mancozeb 400 g فی ایکڑ'
  },

  // ── عمومی سوال (General) ──────────────────────────────────────────────────
  {
    id: 'gen1', tags: ['مٹی','نمونہ','soil','test','لیب'],
    q: 'مٹی کا نمونہ کیسے لیں؟',
    a: '🌱 مٹی کا نمونہ لینے کا طریقہ:\n• کھیت کے 8–10 جگہوں سے مٹی لیں\n• گہرائی: 0–30 سینٹی میٹر\n• سب مٹی ملا کر آدھا کلو الگ کریں\n• تھیلے میں ڈالیں اور نام/کھیت نمبر لکھیں\n• زرعی دفتر یا NARC لیب پر جمع کروائیں'
  },
  {
    id: 'gen2', tags: ['نرسری','nursery','پنیری','seedling'],
    q: 'نرسری کیسے تیار کریں؟',
    a: '🌱 نرسری تیار کرنا:\n• 10×1 میٹر کیاری بنائیں\n• 5 کلو DAP + گوبر کھاد ملائیں\n• بیج 1–2 سینٹی میٹر گہرا لگائیں\n• صبح شام پانی دیں\n• 25–30 دن میں پنیری تیار\n• لگانے سے پہلے جڑیں Thiram میں ڈبوئیں'
  },
  {
    id: 'gen3', tags: ['بیج','seed','treatment','علاج'],
    q: 'بیج کا علاج کیوں ضروری ہے؟',
    a: '🌰 بیج علاج (Seed Treatment):\n• بیماریوں سے بچاتا ہے\n• اُگاؤ (germination) 15–20٪ بہتر ہوتا ہے\n\nطریقہ:\n• Thiram یا Captan: 2.5 g فی کلو بیج\n• گیلے کپڑے میں ملائیں\n• سایے میں سکھائیں\n• اگلے دن بوئیں'
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// IndexedDB helpers
// ─────────────────────────────────────────────────────────────────────────────
let _db = null;

function openDB() {
  if (_db) return Promise.resolve(_db);

  return new Promise((resolve, reject) => {
    if (!window.indexedDB) { reject(new Error('IndexedDB not supported')); return; }

    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;

      // AI answer cache store
      if (!db.objectStoreNames.contains('ai_cache')) {
        const store = db.createObjectStore('ai_cache', { keyPath: 'id', autoIncrement: true });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // FAQ store (pre-seeded)
      if (!db.objectStoreNames.contains('faq')) {
        const faqStore = db.createObjectStore('faq', { keyPath: 'id' });
        faqStore.createIndex('tags', 'tags', { unique: false, multiEntry: true });
      }
    };

    req.onsuccess = async (e) => {
      _db = e.target.result;
      // Reset _db if browser closes the connection (backgrounding, version upgrade, quota exceeded)
      _db.onclose = () => { _db = null; };
      _db.onerror = () => { _db = null; };
      resolve(_db);
      // Seed FAQ if empty
      await seedFAQ(_db);
    };

    req.onerror = () => reject(req.error);
  });
}

async function seedFAQ(db) {
  return new Promise((resolve) => {
    const tx = db.transaction('faq', 'readonly');
    const store = tx.objectStore('faq');
    const countReq = store.count();
    countReq.onsuccess = () => {
      if (countReq.result === 0) {
        // Seed all FAQ entries
        const tx2 = db.transaction('faq', 'readwrite');
        const faqStore = tx2.objectStore('faq');
        FAQ_DATA.forEach(entry => faqStore.put(entry));
        tx2.oncomplete = resolve;
        tx2.onerror = resolve;
      } else {
        resolve();
      }
    };
    countReq.onerror = resolve;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Text similarity — simple keyword overlap (works for Urdu + English)
// ─────────────────────────────────────────────────────────────────────────────
function tokenize(str) {
  return str
    .toLowerCase()
    .replace(/[،؟!؟.,:;]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1);
}

function similarity(queryTokens, entry) {
  const entryTokens = tokenize(entry.q + ' ' + entry.tags.join(' '));
  const matches = queryTokens.filter(t => entryTokens.some(e => e.includes(t) || t.includes(e)));
  if (queryTokens.length === 0) return 0;
  return matches.length / Math.max(queryTokens.length, 1);
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Save an AI answer to IndexedDB cache (call after every successful API reply)
 */
export async function saveAIAnswer(question, answer) {
  try {
    const db = await openDB();
    const tx = db.transaction('ai_cache', 'readwrite');
    tx.objectStore('ai_cache').add({
      question: question.trim(),
      answer,
      timestamp: Date.now()
    });

    // Keep only latest 200 entries to prevent unbounded growth
    await pruneAICache(db);
  } catch (err) {
    console.warn('saveAIAnswer failed:', err);
  }
}

async function pruneAICache(db) {
  return new Promise((resolve) => {
    const tx = db.transaction('ai_cache', 'readwrite');
    const store = tx.objectStore('ai_cache');
    const req = store.index('timestamp').openCursor(null, 'prev');
    let count = 0;
    req.onsuccess = (e) => {
      const cursor = e.target.result;
      if (!cursor) { resolve(); return; }
      count++;
      if (count > 200) cursor.delete();
      else cursor.continue();
    };
    req.onerror = resolve;
  });
}

/**
 * Search offline: AI cache first, then FAQ.
 * Returns { found, answer, source: 'cache'|'faq'|null, score }
 */
export async function searchOffline(query) {
  const qTokens = tokenize(query);
  if (qTokens.length === 0) return { found: false };

  try {
    const db = await openDB();

    // 1. Search AI cache (user's past answers — most relevant)
    const cacheResult = await searchAICache(db, qTokens);
    if (cacheResult.score >= 0.45) {
      return { found: true, source: 'cache', ...cacheResult };
    }

    // 2. Search FAQ database
    const faqResult = await searchFAQ(db, qTokens);
    if (faqResult.score >= 0.30) {
      return { found: true, source: 'faq', ...faqResult };
    }

    return { found: false };
  } catch (err) {
    console.warn('searchOffline error:', err);

    // Fallback: search in-memory FAQ_DATA if IndexedDB fails
    const best = FAQ_DATA
      .map(entry => ({ entry, score: similarity(qTokens, entry) }))
      .sort((a, b) => b.score - a.score)[0];

    if (best && best.score >= 0.30) {
      return { found: true, source: 'faq', answer: best.entry.a, question: best.entry.q, score: best.score };
    }
    return { found: false };
  }
}

async function searchAICache(db, qTokens) {
  return new Promise((resolve) => {
    const tx = db.transaction('ai_cache', 'readonly');
    const req = tx.objectStore('ai_cache').getAll();
    req.onsuccess = () => {
      const entries = req.result || [];
      // Only use answers from last 30 days
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const recent = entries.filter(e => e.timestamp > cutoff);

      const best = recent
        .map(e => ({ e, score: similarity(qTokens, { q: e.question, tags: tokenize(e.question) }) }))
        .sort((a, b) => b.score - a.score)[0];

      if (best) resolve({ answer: best.e.answer, question: best.e.question, score: best.score });
      else resolve({ score: 0 });
    };
    req.onerror = () => resolve({ score: 0 });
  });
}

async function searchFAQ(db, qTokens) {
  return new Promise((resolve) => {
    const tx = db.transaction('faq', 'readonly');
    const req = tx.objectStore('faq').getAll();
    req.onsuccess = () => {
      const entries = req.result || [];
      const best = entries
        .map(entry => ({ entry, score: similarity(qTokens, entry) }))
        .sort((a, b) => b.score - a.score)[0];

      if (best) resolve({ answer: best.entry.a, question: best.entry.q, score: best.score });
      else resolve({ score: 0 });
    };
    req.onerror = () => resolve({ score: 0 });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Offline question queue (localStorage — survives page reload)
// ─────────────────────────────────────────────────────────────────────────────
const QUEUE_KEY = 'dehati_offline_queue';

export function queueQuestion(question) {
  try {
    const queue = getOfflineQueue();
    queue.push({ question, timestamp: Date.now(), id: Date.now() });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.warn('queueQuestion failed:', err);
  }
}

export function getOfflineQueue() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function removeFromQueue(id) {
  try {
    const queue = getOfflineQueue().filter(q => q.id !== id);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {}
}

export function clearOfflineQueue() {
  localStorage.removeItem(QUEUE_KEY);
}

// Initialize DB on import (pre-warm)
openDB().catch(() => {});
