/**
 * DehatiAI — Offline Agronomy Database
 * Ground-truth prescriptions for Punjab & Sindh agriculture (100% Offline)
 */

export const AGRONOMY_DATABASE = {
  "note": "Pakistan Agronomy Prescription Dictionary — Ground-truth agronomic advisories verified for Punjab & Sindh farming ecosystems. Formulation strength varies by brand — confirm exact rate on the product label.",
  "wheat_black_rust": {
    "name_ur": "گندم کا کالا زنگ (بلیک / سٹیم رسٹ)",
    "name_en": "Wheat Black / Stem Rust",
    "treatment_summary": "تنے اور پتوں پر لمبوترے گہرے بھورے سے کالے چھالے نظر آتے ہی فوری طور پر فنجی سائیڈ سپرے کریں۔ گرم موسم میں یہ بیماری دانے کو بالکل باریک کر دیتی ہے۔",
    "withholding_period_days": 30,
    "organic_alternative": "نیم کا تیل 5 ملی لیٹر فی لیٹر پانی میں ملا کر احتیاطی سپرے کریں یا لکڑی کی راکھ پتوں پر چھڑکیں۔",
    "medicines": [
      {
        "brand": "Nativo 75WG",
        "active": "Tebuconazole 50% + Trifloxystrobin 25%",
        "dosage": "65 گرام فی ایکڑ",
        "method": "سپرے",
        "withholding_period_days": 30,
        "suppliers": [
          "Bayer"
        ],
        "estimated_price_pkr": "Rs. 1,600 - 2,100",
        "tank_dosage_20l": "13 گرام فی 20 لیٹر ڈرمکی (5 ڈرمکیاں فی ایکڑ)"
      },
      {
        "brand": "Tilt 250EC",
        "active": "Propiconazole 25%",
        "dosage": "200 ملی لیٹر فی ایکڑ",
        "method": "سپرے",
        "withholding_period_days": 30,
        "suppliers": [
          "Syngenta",
          "FMC"
        ],
        "estimated_price_pkr": "Rs. 1,250 - 1,600",
        "tank_dosage_20l": "40 ملی لیٹر فی 20 لیٹر ڈرمکی (5 ڈرمکیاں فی ایکڑ)"
      },
      {
        "brand": "Score 250EC",
        "active": "Difenoconazole 25%",
        "dosage": "125 ملی لیٹر فی ایکڑ",
        "method": "سپرے",
        "withholding_period_days": 21,
        "suppliers": [
          "Syngenta"
        ],
        "estimated_price_pkr": "Rs. 1,450 - 1,900",
        "tank_dosage_20l": "25 ملی لیٹر فی 20 لیٹر ڈرمکی (5 ڈرمکیاں فی ایکڑ)"
      }
    ],
    "prevention": "کالے زنگ کے خلاف منظور شدہ مزاحم اقسام کاشت کریں۔ بوائی بروقت کریں اور متوازن فاسفورس و پوٹاش کا استعمال کریں۔",
    "severity": "شدید (High Risk / Stem Lodging)",
    "emergency_action": "تنے پر کالی پاؤڈر والی پھپھوندی نظر آنے پر بغیر کسی تاخیر کے سسٹمک فنجی سائیڈ سپرے کریں تاکہ تنے کے گرنے (Lodging) سے بچاؤ ہو سکے۔",
    "spray_conditions": "صبح شبنم سوکھنے کے بعد یا شام کو سپرے کریں۔ کھوکھلی کون نوزل استعمال کریں تاکہ تنے کے نچلے حصے تک دوا پہنچے۔",
    "fertilizer_adjustment": "یوریا کھاد فوری روکیں اور پوٹاش (SOP) کا استعمال پودے کے خلیات کو سخت اور تنے کو مضبوط بناتا ہے۔"
  },
  "wheat_brown_rust": {
    "name_ur": "گندم کا بھورا زنگ (براؤن رسٹ)",
    "name_en": "Wheat Brown Rust",
    "treatment_summary": "بیماری کی ابتدائی علامات پر فوری سپرے کریں، دیر ہونے پر نقصان بڑھ جاتا ہے۔",
    "withholding_period_days": 30,
    "organic_alternative": "نیم کا تیل 5 ملی لیٹر فی لیٹر پانی میں ملا کر احتیاطی سپرے کریں یا لکڑی کی راکھ پتوں پر چھڑکیں۔",
    "medicines": [
      {
        "brand": "Tilt / Bumper 250EC",
        "active": "Propiconazole 25%",
        "dosage": "200 ملی لیٹر فی ایکڑ",
        "method": "سپرے",
        "withholding_period_days": 30,
        "suppliers": [
          "Syngenta",
          "FMC"
        ],
        "estimated_price_pkr": "Rs. 1,250 - 1,600",
        "tank_dosage_20l": "40 ملی لیٹر فی 20 لیٹر ڈرمکی (5 ڈرمکیاں فی ایکڑ)"
      },
      {
        "brand": "Folicur / Orius 250EW",
        "active": "Tebuconazole 25%",
        "dosage": "200 ملی لیٹر فی ایکڑ",
        "method": "سپرے",
        "withholding_period_days": 30,
        "suppliers": [
          "Bayer",
          "Engro"
        ],
        "estimated_price_pkr": "Rs. 1,400 - 1,850",
        "tank_dosage_20l": "40 ملی لیٹر فی 20 لیٹر ڈرمکی (5 ڈرمکیاں فی ایکڑ)"
      },
      {
        "brand": "Amistar Top",
        "active": "Azoxystrobin 20% + Difenoconazole 12.5%",
        "dosage": "200 ملی لیٹر فی ایکڑ",
        "method": "سپرے",
        "withholding_period_days": 21,
        "suppliers": [
          "Syngenta"
        ],
        "estimated_price_pkr": "Rs. 2,200 - 2,700",
        "tank_dosage_20l": "40 ملی لیٹر فی 20 لیٹر ڈرمکی (5 ڈرمکیاں فی ایکڑ)"
      }
    ],
    "prevention": "زنگ کے خلاف مزاحم اقسام کاشت کریں، متوازن کھاد (زیادہ نائٹروجن سے گریز) دیں، اور کھیت کا باقاعدہ معائنہ کرتے رہیں۔",
    "severity": "درمیانہ تا شدید (Moderate to High)",
    "emergency_action": "فوری طور پر نائٹروجن (یوریا) کھاد کا استعمال بند کریں اور اگلے 24 گھنٹے میں پہلا فنجی سائیڈ سپرے کریں۔",
    "spray_conditions": "صبح شبنم خشک ہونے کے فوراً بعد یا شام 4 بجے کے بعد سپرے کریں۔ ہوا کی رفتار 10 کلومیٹر سے کم ہو۔",
    "fertilizer_adjustment": "یوریا کا استعمال روکیں۔ پوٹاش (SOP) کا استعمال کریں تاکہ پودوں میں بیماری کے خلاف قوت مدافعت بڑھے۔"
  },
  "wheat_yellow_stripe_rust": {
    "name_ur": "گندم کا پیلا زنگ (یلو رسٹ)",
    "name_en": "Wheat Yellow/Stripe Rust",
    "treatment_summary": "پتوں پر پیلی دھاریاں نظر آتے ہی سپرے شروع کریں، ٹھنڈے و نم موسم میں پھیلاؤ تیز ہوتا ہے۔",
    "withholding_period_days": 30,
    "organic_alternative": "نیم کا تیل 5 ملی لیٹر فی لیٹر پانی + ہلدی پاؤڈر کا محلول سپرے کریں۔",
    "medicines": [
      {
        "brand": "Tilt / Bumper 250EC",
        "active": "Propiconazole 25%",
        "dosage": "200 ملی لیٹر فی ایکڑ",
        "method": "سپرے",
        "withholding_period_days": 30,
        "suppliers": [
          "Syngenta",
          "FMC"
        ],
        "estimated_price_pkr": "Rs. 1,250 - 1,600",
        "tank_dosage_20l": "40 ملی لیٹر فی 20 لیٹر ڈرمکی (5 ڈرمکیاں فی ایکڑ)"
      },
      {
        "brand": "Nativo 75WG",
        "active": "Tebuconazole 50% + Trifloxystrobin 25%",
        "dosage": "80 گرام فی ایکڑ",
        "method": "سپرے",
        "withholding_period_days": 30,
        "suppliers": [
          "Bayer"
        ],
        "estimated_price_pkr": "Rs. 1,800 - 2,300",
        "tank_dosage_20l": "16 گرام فی 20 لیٹر ڈرمکی (5 ڈرمکیاں فی ایکڑ)"
      },
      {
        "brand": "Score 250EC",
        "active": "Difenoconazole 25%",
        "dosage": "100 ملی لیٹر فی ایکڑ",
        "method": "سپرے",
        "withholding_period_days": 21,
        "suppliers": [
          "Syngenta"
        ],
        "estimated_price_pkr": "Rs. 1,100 - 1,450",
        "tank_dosage_20l": "20 ملی لیٹر فی 20 لیٹر ڈرمکی (5 ڈرمکیاں فی ایکڑ)"
      }
    ],
    "prevention": "منظور شدہ مزاحم اقسام کاشت کریں، بروقت کاشت کریں اور ارد گرد کے متاثرہ کھیتوں پر نظر رکھیں۔",
    "severity": "شدید (High Risk)",
    "emergency_action": "پتوں پر پیلی پٹیاں یا دھاریاں نظر آتے ہی فوری طور پر یوریا بند کریں اور 24 گھنٹے میں فنجی سائیڈ سپرے مکمل کریں۔",
    "spray_conditions": "صبح 8 سے 10 بجے یا شام 4 سے 6 بجے سپرے کریں۔ تیز دھوپ یا شدید سردی میں سپرے مت کریں۔",
    "fertilizer_adjustment": "نائٹروجن کھاد کا استعمال قطعی روک دیں۔ زنک سلفیٹ یا پوٹاش پودے کو بیماری سے سنبھلنے میں مدد دیتے ہیں۔"
  },
  "wheat_powdery_mildew": {
    "name_ur": "گندم کی پاؤڈری پھپھوندی",
    "name_en": "Wheat Powdery Mildew",
    "treatment_summary": "پتوں پر سفید پاؤڈر جیسی تہہ نظر آنے پر سپرے کریں۔",
    "withholding_period_days": 14,
    "organic_alternative": "بیکنگ سوڈا 5 گرام + نیم تیل 5 ملی لیٹر فی لیٹر پانی محلول۔",
    "medicines": [
      {
        "brand": "Kumulus DF",
        "active": "Sulphur 80%",
        "dosage": "600-800 گرام فی ایکڑ",
        "method": "سپرے",
        "withholding_period_days": 7,
        "suppliers": [
          "BASF",
          "Local"
        ],
        "estimated_price_pkr": "Rs. 850 - 1,150",
        "tank_dosage_20l": "120 تا 160 گرام فی 20 لیٹر ڈرمکی (5 ڈرمکیاں فی ایکڑ)"
      },
      {
        "brand": "Tilt 250EC",
        "active": "Propiconazole 25%",
        "dosage": "200 ملی لیٹر فی ایکڑ",
        "method": "سپرے",
        "withholding_period_days": 30,
        "suppliers": [
          "Syngenta"
        ],
        "estimated_price_pkr": "Rs. 1,250 - 1,600",
        "tank_dosage_20l": "40 ملی لیٹر فی 20 لیٹر ڈرمکی (5 ڈرمکیاں فی ایکڑ)"
      },
      {
        "brand": "Nativo 75WG",
        "active": "Tebuconazole 50% + Trifloxystrobin 25%",
        "dosage": "80 گرام فی ایکڑ",
        "method": "سپرے",
        "withholding_period_days": 30,
        "suppliers": [
          "Bayer"
        ],
        "estimated_price_pkr": "Rs. 1,800 - 2,300",
        "tank_dosage_20l": "16 گرام فی 20 لیٹر ڈرمکی (5 ڈرمکیاں فی ایکڑ)"
      }
    ],
    "prevention": "بیج کی مناسب مقدار استعمال کریں تاکہ فصل زیادہ گھنی نہ ہو، اور نائٹروجن کھاد کا زیادہ استعمال نہ کریں۔",
    "severity": "درمیانہ (Moderate)",
    "emergency_action": "سفید آٹے جیسے دھبے نظر آتے ہی گھنے پودوں میں ہوا کی گزرگاہ بنائیں اور فنجی سائیڈ سپرے کریں۔",
    "spray_conditions": "خشک موسم میں صبح کے وقت سپرے کریں۔ کھوکھلی کون (Hollow Cone) نوزل استعمال کریں۔",
    "fertilizer_adjustment": "نائٹروجن کھاد کی حد سے زیادہ مقدار فورا روکیں۔ پوٹاش کھاد کا چھڑکاؤ کریں۔"
  },
  "wheat_septoria_blotch": {
    "name_ur": "گندم کا سیپٹوریا بلاچ",
    "name_en": "Wheat Septoria Blotch",
    "treatment_summary": "نچلے پتوں پر بھورے دھبے نظر آنے پر سپرے کریں، خاص طور پر بارش کے موسم میں۔",
    "withholding_period_days": 14,
    "organic_alternative": "کاپر آکسی کلورائڈ اور نیم کے تیل کا احتیاطی سپرے۔",
    "medicines": [
      {
        "brand": "Antracol 70WP",
        "active": "Propineb 70%",
        "dosage": "600 گرام فی ایکڑ",
        "method": "سپرے",
        "withholding_period_days": 14,
        "suppliers": [
          "Bayer"
        ],
        "estimated_price_pkr": "Rs. 1,200 - 1,500",
        "tank_dosage_20l": "120 گرام فی 20 لیٹر ڈرمکی (5 ڈرمکیاں فی ایکڑ)"
      },
      {
        "brand": "Daconil / Bravo",
        "active": "Chlorothalonil 75%",
        "dosage": "400 گرام فی ایکڑ",
        "method": "سپرے",
        "withholding_period_days": 14,
        "suppliers": [
          "Syngenta",
          "FMC"
        ],
        "estimated_price_pkr": "Rs. 1,350 - 1,700",
        "tank_dosage_20l": "80 گرام فی 20 لیٹر ڈرمکی (5 ڈرمکیاں فی ایکڑ)"
      }
    ],
    "prevention": "فصل کی باقیات کو تلف کریں اور مناسب فاصلے پر کاشت کریں تاکہ ہوا کی گزرگاہ رہے۔",
    "severity": "درمیانہ (Moderate)",
    "emergency_action": "نچلے پتوں سے بیماری اوپر پھیلنے سے پہلے فوری حفاظتی سپرے کریں۔",
    "spray_conditions": "بارش کے وقفے کے بعد جب پتے خشک ہوں تو سپرے کریں۔",
    "fertilizer_adjustment": "فاسفورس اور پوٹاش کھاد مناسب رکھیں، یوریا کا غیر ضروری استعمال روکیں۔"
  },
  "potato_late_blight": {
    "name_ur": "آلو کا لیٹ بلائٹ (پچھیتا جھلساؤ)",
    "name_en": "Potato Late Blight",
    "treatment_summary": "نم اور ٹھنڈے موسم میں پتوں پر پانی بھرے دھبے نظر آتے ہی فوری سپرے کریں، تاخیر پوری فصل تباہ کر سکتی ہے۔",
    "withholding_period_days": 14,
    "organic_alternative": "کاپر ڈرنچ اور چھاچھ (کھٹی لسی) 10٪ محلول کا احتیاطی چھڑکاؤ۔",
    "medicines": [
      {
        "brand": "Ridomil Gold MZ 68WG",
        "active": "Metalaxyl-M 4% + Mancozeb 64%",
        "dosage": "600 گرام فی ایکڑ",
        "method": "سپرے",
        "withholding_period_days": 14,
        "suppliers": [
          "Syngenta"
        ],
        "estimated_price_pkr": "Rs. 1,650 - 2,100",
        "tank_dosage_20l": "120 گرام فی 20 لیٹر ڈرمکی (5 ڈرمکیاں فی ایکڑ)"
      },
      {
        "brand": "Curzate M8",
        "active": "Cymoxanil 8% + Mancozeb 64%",
        "dosage": "600 گرام فی ایکڑ",
        "method": "سپرے",
        "withholding_period_days": 14,
        "suppliers": [
          "FMC"
        ],
        "estimated_price_pkr": "Rs. 1,450 - 1,800",
        "tank_dosage_20l": "120 گرام فی 20 لیٹر ڈرمکی (5 ڈرمکیاں فی ایکڑ)"
      },
      {
        "brand": "Acrobat MZ",
        "active": "Dimethomorph 9% + Mancozeb 60%",
        "dosage": "600 گرام فی ایکڑ",
        "method": "سپرے",
        "withholding_period_days": 14,
        "suppliers": [
          "BASF"
        ],
        "estimated_price_pkr": "Rs. 1,550 - 1,950",
        "tank_dosage_20l": "120 گرام فی 20 لیٹر ڈرمکی (5 ڈرمکیاں فی ایکڑ)"
      }
    ],
    "prevention": "صحت بخش اور تصدیق شدہ بیج استعمال کریں، پودوں کے درمیان مناسب فاصلہ رکھیں اور کھیت میں پانی کھڑا نہ ہونے دیں۔",
    "severity": "انتہائی شدید (Critical Emergency)",
    "emergency_action": "فوری آبپاشی روکیں! کھیت میں نمی ختم کریں اور اگلے 12 سے 24 گھنٹے میں سسٹمک فنجی سائیڈ سپرے کریں ورنہ 48 گھنٹے میں پوری فصل ختم ہو سکتی ہے۔",
    "spray_conditions": "پتے خشک ہونے پر فورا سپرے کریں۔ باریک قطرے بنانے والی ہولو کون نوزل استعمال کریں تاکہ پتے کا نچلا حصہ بھی گیلا ہو۔",
    "fertilizer_adjustment": "یوریا کھاد کا استعمال مکمل بند کریں۔ پوٹاشیم فاسفائٹ یا پوٹاش کا سپرے پودے کی خلیاتی دیواریں مضبوط کرتا ہے۔"
  },
  "potato_early_blight": {
    "name_ur": "آلو کا ارلی بلائٹ (ابتدائی جھلساؤ)",
    "name_en": "Potato Early Blight",
    "treatment_summary": "پرانے پتوں پر ہدف نما (target-shaped) دھبے نظر آنے پر سپرے کریں۔",
    "withholding_period_days": 7,
    "organic_alternative": "نیم تیل + بیکنگ سوڈا 5 گرام فی لیٹر پانی۔",
    "medicines": [
      {
        "brand": "Daconil / Bravo",
        "active": "Chlorothalonil 75%",
        "dosage": "400 گرام فی ایکڑ",
        "method": "سپرے",
        "withholding_period_days": 7,
        "suppliers": [
          "Syngenta"
        ],
        "estimated_price_pkr": "Rs. 1,350 - 1,700",
        "tank_dosage_20l": "80 گرام فی 20 لیٹر ڈرمکی (5 ڈرمکیاں فی ایکڑ)"
      },
      {
        "brand": "Indofil M-45",
        "active": "Mancozeb 80%",
        "dosage": "800 گرام فی ایکڑ",
        "method": "سپرے",
        "withholding_period_days": 7,
        "suppliers": [
          "Indofil",
          "Engro"
        ],
        "estimated_price_pkr": "Rs. 950 - 1,250",
        "tank_dosage_20l": "160 گرام فی 20 لیٹر ڈرمکی (5 ڈرمکیاں فی ایکڑ)"
      }
    ],
    "prevention": "متوازن کھاد دیں اور فصل کی گردش اپنائیں تاکہ زمین میں پھپھوندی جمع نہ ہو۔",
    "severity": "درمیانہ (Moderate)",
    "emergency_action": "پتوں پر دائرہ نما بھورے نشانات نظر آنے پر فورا خشک موسم میں حفاظتی سپرے کریں۔",
    "spray_conditions": "صبح کے وقت سپرے کریں جب شبنم ختم ہو چکی ہو۔",
    "fertilizer_adjustment": "پودے کو کمزور نہ ہونے دیں، نائٹروجن، فاسفورس اور پوٹاش کی متوازن خوراک دیں۔"
  },
  "rice_brown_leaf_spot": {
    "name_ur": "چاول کا بھورا پتا داغ",
    "name_en": "Rice Brown Leaf Spot",
    "treatment_summary": "پتوں پر بھورے بیضوی دھبے نظر آنے پر سپرے کریں۔",
    "withholding_period_days": 21,
    "organic_alternative": "پوٹاشیم سلفیٹ اور نیم کھلی کا زمین میں استعمال۔",
    "medicines": [
      {
        "brand": "Indofil M-45",
        "active": "Mancozeb 80%",
        "dosage": "800 گرام فی ایکڑ",
        "method": "سپرے",
        "withholding_period_days": 21,
        "suppliers": [
          "Indofil",
          "Engro"
        ],
        "estimated_price_pkr": "Rs. 950 - 1,250",
        "tank_dosage_20l": "160 گرام فی 20 لیٹر ڈرمکی (5 ڈرمکیاں فی ایکڑ)"
      },
      {
        "brand": "Bavistin",
        "active": "Carbendazim 50%",
        "dosage": "200 گرام فی ایکڑ",
        "method": "سپرے",
        "withholding_period_days": 21,
        "suppliers": [
          "BASF"
        ],
        "estimated_price_pkr": "Rs. 850 - 1,100",
        "tank_dosage_20l": "40 گرام فی 20 لیٹر ڈرمکی (5 ڈرمکیاں فی ایکڑ)"
      }
    ],
    "prevention": "متوازن کھاد استعمال کریں (پوٹاش کی کمی نہ ہونے دیں) اور معیاری بیج کاشت کریں۔",
    "severity": "درمیانہ (Moderate)",
    "emergency_action": "فصل کو زنک اور پوٹاش کی فوری کمی سے بچائیں اور حفاظتی فنجی سائیڈ سپرے کریں۔",
    "spray_conditions": "صبح 9 بجے سے پہلے یا عصر کے بعد 100 لیٹر پانی کے ساتھ سپرے کریں۔",
    "fertilizer_adjustment": "یہ بیماری کمزور زمین اور غذائی کمی سے پھیلتی ہے؛ زنک سلفیٹ (33%) 6 کلو فی ایکڑ یا فولیئر سپرے کریں۔"
  },
  "rice_blast": {
    "name_ur": "چاول کا بلاسٹ (جھلساؤ)",
    "name_en": "Rice Blast",
    "treatment_summary": "پتوں یا بالیوں پر آنکھ نما دھبے نظر آتے ہی فوری سپرے کریں۔",
    "withholding_period_days": 21,
    "organic_alternative": "سلفر پوڈر کی دھونی اور کھیت سے زائد نائٹروجن کا اخراج۔",
    "medicines": [
      {
        "brand": "Beam 75WP",
        "active": "Tricyclazole 75%",
        "dosage": "120 گرام فی ایکڑ",
        "method": "سپرے",
        "withholding_period_days": 21,
        "suppliers": [
          "Dow/Corteva",
          "FMC"
        ],
        "estimated_price_pkr": "Rs. 1,400 - 1,800",
        "tank_dosage_20l": "24 گرام فی 20 لیٹر ڈرمکی (5 ڈرمکیاں فی ایکڑ)"
      },
      {
        "brand": "Amistar Top",
        "active": "Azoxystrobin + Difenoconazole",
        "dosage": "200 ملی لیٹر فی ایکڑ",
        "method": "سپرے",
        "withholding_period_days": 21,
        "suppliers": [
          "Syngenta"
        ],
        "estimated_price_pkr": "Rs. 2,200 - 2,700",
        "tank_dosage_20l": "40 ملی لیٹر فی 20 لیٹر ڈرمکی (5 ڈرمکیاں فی ایکڑ)"
      }
    ],
    "prevention": "زیادہ نائٹروجن کھاد سے گریز کریں، صحت مند بیج استعمال کریں اور کھیت میں پانی کا مناسب انتظام رکھیں۔",
    "severity": "شدید (High Risk)",
    "emergency_action": "پتوں پر آنکھ نما دھبے یا گردن پر کالک نظر آتے ہی فوری سپرے کریں ورنہ دانہ نہیں بنے گا۔",
    "spray_conditions": "تیز ہوا میں سپرے نہ کریں، باریک قطرے بنانے والی نوزل استعمال کریں۔",
    "fertilizer_adjustment": "یوریا کھاد کا استعمال فوری طور پر روک دیں۔ پوٹاش (SOP) کا استعمال پودے کو بیماری سے بچاتا ہے۔"
  },
  "cotton_leaf_curl_virus": {
    "name_ur": "کپاس کا پتا مروڑ وائرس (CLCuV)",
    "name_en": "Cotton Leaf Curl Virus",
    "treatment_summary": "یہ وائرس سفید مکھی (whitefly) سے پھیلتا ہے — کوئی براہ راست زہر وائرس کا علاج نہیں کرتا، سفید مکھی کا خاتمہ ہی اصل حکمت عملی ہے۔",
    "withholding_period_days": 21,
    "organic_alternative": "پیلا چپکنے والا کارڈ (Yellow Sticky Trap) 20 فی ایکڑ لگائیں اور نیم تیل سپرے کریں۔",
    "medicines": [
      {
        "brand": "Confidor 200SL",
        "active": "Imidacloprid 200g/L",
        "dosage": "80 ملی لیٹر فی ایکڑ",
        "method": "سپرے (سفید مکھی کنٹرول)",
        "withholding_period_days": 21,
        "suppliers": [
          "Bayer"
        ],
        "estimated_price_pkr": "Rs. 950 - 1,300",
        "tank_dosage_20l": "16 ملی لیٹر فی 20 لیٹر ڈرمکی (5 ڈرمکیاں فی ایکڑ)"
      },
      {
        "brand": "Polo / Aphlok",
        "active": "Diafenthiuron 50%",
        "dosage": "400 گرام فی ایکڑ",
        "method": "سپرے (سفید مکھی کنٹرول)",
        "withholding_period_days": 14,
        "suppliers": [
          "Syngenta"
        ],
        "estimated_price_pkr": "Rs. 1,800 - 2,200",
        "tank_dosage_20l": "80 گرام فی 20 لیٹر ڈرمکی (5 ڈرمکیاں فی ایکڑ)"
      }
    ],
    "prevention": "مزاحم اقسام کاشت کریں، متاثرہ پودے فوری اکھاڑ دیں اور کھیت کے اردگرد جڑی بوٹیاں (میزبان پودے) صاف رکھیں۔",
    "severity": "شدید (High Risk)",
    "emergency_action": "پتے مڑنے والے وائرس کی کوئی کیمیائی دوا نہیں، فوری طور پر سفید مکھی (ناقل کیڑے) کا خاتمہ کریں تاکہ یہ دوسرے پودوں میں نہ پھیلے۔",
    "spray_conditions": "صبح 8 سے 10 بجے یا شام 4 سے 6 بجے سپرے کریں۔ نوزل کا رخ پتے کے نچلے حصے کی طرف رکھیں۔",
    "fertilizer_adjustment": "نائٹروجن کا استعمال کم کریں؛ مائیکرو نیوٹرینٹس (زنک، بوران) اور پوٹاش کا سپرے پودے میں قوت مدافعت پیدا کرے گا۔"
  },
  "cotton_anthracnose": {
    "name_ur": "کپاس کا انتھراکنوز",
    "name_en": "Cotton Anthracnose",
    "treatment_summary": "ٹینڈوں اور پتوں پر گہرے دھبے نظر آنے پر سپرے کریں۔",
    "withholding_period_days": 21,
    "organic_alternative": "بیج کا ٹریٹمنٹ ٹرائیکوڈرما (Biocontrol) سے کریں۔",
    "medicines": [
      {
        "brand": "Bavistin",
        "active": "Carbendazim 50%",
        "dosage": "200 گرام فی ایکڑ",
        "method": "سپرے",
        "withholding_period_days": 21,
        "suppliers": [
          "BASF"
        ],
        "estimated_price_pkr": "Rs. 850 - 1,100",
        "tank_dosage_20l": "40 گرام فی 20 لیٹر ڈرمکی (5 ڈرمکیاں فی ایکڑ)"
      },
      {
        "brand": "Indofil M-45",
        "active": "Mancozeb 80%",
        "dosage": "800 گرام فی ایکڑ",
        "method": "سپرے",
        "withholding_period_days": 21,
        "suppliers": [
          "Indofil",
          "Engro"
        ],
        "estimated_price_pkr": "Rs. 950 - 1,250",
        "tank_dosage_20l": "160 گرام فی 20 لیٹر ڈرمکی (5 ڈرمکیاں فی ایکڑ)"
      }
    ],
    "prevention": "منظور شدہ زہر سے بیج کا ٹریٹمنٹ کریں اور فصل کی باقیات تلف کریں۔",
    "severity": "درمیانہ (Moderate)",
    "emergency_action": "متاثرہ ڈوڈیاں اور پتے تلف کریں اور فوری پھپھوندی کش دوائی سپرے کریں۔",
    "spray_conditions": "بارش کے بعد خشک موسم میں سپرے کریں۔",
    "fertilizer_adjustment": "پوٹاش اور فاسفورس کی مناسب مقدار دیں، نائٹروجن کی زیادتی سے پرہیز کریں۔"
  },
  "tomato_early_blight": {
    "name_ur": "ٹماٹر کا ارلی بلائٹ",
    "name_en": "Tomato Early Blight",
    "treatment_summary": "نچلے پرانے پتوں پر ہدف نما دھبے نظر آنے پر سپرے کریں۔",
    "withholding_period_days": 7,
    "organic_alternative": "نیم کے پتے اُبال کر پنچھاہٹ کا سپرے کریں یا لسی سپرے کریں۔",
    "medicines": [
      {
        "brand": "Daconil / Bravo",
        "active": "Chlorothalonil 75%",
        "dosage": "400 گرام فی ایکڑ",
        "method": "سپرے",
        "withholding_period_days": 5,
        "suppliers": [
          "Syngenta"
        ],
        "estimated_price_pkr": "Rs. 1,350 - 1,700",
        "tank_dosage_20l": "80 گرام فی 20 لیٹر ڈرمکی (5 ڈرمکیاں فی ایکڑ)"
      },
      {
        "brand": "Amistar Top",
        "active": "Azoxystrobin + Difenoconazole",
        "dosage": "200 ملی لیٹر فی ایکڑ",
        "method": "سپرے",
        "withholding_period_days": 7,
        "suppliers": [
          "Syngenta"
        ],
        "estimated_price_pkr": "Rs. 2,200 - 2,700",
        "tank_dosage_20l": "40 ملی لیٹر فی 20 لیٹر ڈرمکی (5 ڈرمکیاں فی ایکڑ)"
      }
    ],
    "prevention": "پودوں کے درمیان مناسب فاصلہ رکھیں، نچلے متاثرہ پتے توڑ دیں اور اوپر سے پانی دینے کے بجائے جڑوں میں پانی دیں۔",
    "severity": "درمیانہ تا شدید (Moderate to High)",
    "emergency_action": "نچلے بیمار پتے احتیاط سے کاٹ کر دور پھینکیں اور 24 گھنٹے میں فنجی سائیڈ سپرے کریں۔",
    "spray_conditions": "صبح سویرے پودے سوکھنے پر سپرے کریں۔",
    "fertilizer_adjustment": "کیلشیم اور پوٹاش کی مناسب فراہمی یقینی بنائیں، یوریا کا بے جا استعمال روکیں۔"
  },
  "tomato_yellow_leaf_curl_virus": {
    "name_ur": "ٹماٹر کا پتا مروڑ وائرس",
    "name_en": "Tomato Yellow Leaf Curl Virus",
    "treatment_summary": "یہ وائرس سفید مکھی سے پھیلتا ہے — سفید مکھی کو روکنا ہی وائرس سے بچاؤ کا واحد ذریعہ ہے۔",
    "withholding_period_days": 7,
    "organic_alternative": "پیلا چپکنے والا کارڈ نرسری میں لگائیں اور پودے جالی سے ڈھانپیں۔",
    "medicines": [
      {
        "brand": "Confidor 200SL",
        "active": "Imidacloprid 200g/L",
        "dosage": "80 ملی لیٹر فی ایکڑ",
        "method": "سپرے (سفید مکھی کنٹرول)",
        "withholding_period_days": 7,
        "suppliers": [
          "Bayer"
        ],
        "estimated_price_pkr": "Rs. 950 - 1,300",
        "tank_dosage_20l": "16 ملی لیٹر فی 20 لیٹر ڈرمکی (5 ڈرمکیاں فی ایکڑ)"
      },
      {
        "brand": "Actara 25WG",
        "active": "Thiamethoxam 25%",
        "dosage": "40 گرام فی ایکڑ",
        "method": "سپرے (سفید مکھی کنٹرول)",
        "withholding_period_days": 7,
        "suppliers": [
          "Syngenta"
        ],
        "estimated_price_pkr": "Rs. 650 - 900",
        "tank_dosage_20l": "8 گرام فی 20 لیٹر ڈرمکی (5 ڈرمکیاں فی ایکڑ)"
      }
    ],
    "prevention": "نرسری کو جالی سے ڈھانپیں، مزاحم اقسام کاشت کریں اور متاثرہ پودے فوری اکھاڑ دیں۔",
    "severity": "شدید (High Risk)",
    "emergency_action": "شدید متاثرہ پودے فورا اکھاڑ کر زمین میں دبا دیں اور سفید مکھی کا فوری سپرے کریں۔",
    "spray_conditions": "شام کے وقت پتے کے نچلے رخ پر ہولو کون نوزل سے سپرے کریں۔",
    "fertilizer_adjustment": "پودے کی طاقت بحال کرنے کے لیے امینو ایسڈز اور مائیکرو نیوٹرینٹس کا سپرے کریں۔"
  },
  "citrus_canker": {
    "name_ur": "کھٹی پھلوں کا کینکر",
    "name_en": "Citrus Canker",
    "treatment_summary": "پتوں، ٹہنیوں اور پھل پر ابھرے ہوئے زخم نظر آنے پر کاپر پر مبنی زہر کا سپرے کریں۔",
    "withholding_period_days": 14,
    "organic_alternative": "بورڈو مکسچر (Bordeaux Mixture 1%) کا سپرے کریں۔",
    "medicines": [
      {
        "brand": "Cuprocaffaro / Copper Oxychloride 50WP",
        "active": "Copper Oxychloride 50%",
        "dosage": "600 گرام فی ایکڑ",
        "method": "سپرے",
        "withholding_period_days": 14,
        "suppliers": [
          "Local",
          "FMC"
        ],
        "estimated_price_pkr": "Rs. 1,100 - 1,450",
        "tank_dosage_20l": "120 گرام فی 20 لیٹر ڈرمکی (5 ڈرمکیاں فی ایکڑ)"
      },
      {
        "brand": "Kocide",
        "active": "Copper Hydroxide 53.8%",
        "dosage": "400 گرام فی ایکڑ",
        "method": "سپرے",
        "withholding_period_days": 14,
        "suppliers": [
          "Corteva"
        ],
        "estimated_price_pkr": "Rs. 1,500 - 1,900",
        "tank_dosage_20l": "80 گرام فی 20 لیٹر ڈرمکی (5 ڈرمکیاں فی ایکڑ)"
      }
    ],
    "prevention": "تیز ہوا سے بچاؤ کے لیے ونڈ بریک لگائیں، کینچی کو زہر آلود کریں اور متاثرہ شاخیں کاٹ کر تلف کریں۔",
    "severity": "شدید (High Risk)",
    "emergency_action": "باغ کی قینچی کو جراثیم کش دوا سے صاف کر کے متاثرہ ٹہنیاں کاٹ کر جلائیں اور فوری کاپر سپرے کریں۔",
    "spray_conditions": "نئی پھوٹ کے وقت اور بارش کے بعد فورا سپرے کریں۔ تیز ہوا میں کینکر کے جراثیم پھیلتے ہیں۔",
    "fertilizer_adjustment": "زنک، میگنیز اور بوران کا فولیئر سپرے پودے کے بافتوں کو مضبوط بناتا ہے۔"
  },
  "mango_anthracnose": {
    "name_ur": "آم کا انتھراکنوز",
    "name_en": "Mango Anthracnose",
    "treatment_summary": "پھول، پتوں اور پھل پر کالے دھبے نظر آنے پر سپرے کریں، خاص طور پر پھول آنے کے وقت۔",
    "withholding_period_days": 14,
    "organic_alternative": "آم کی کٹی چھٹی کے بعد کاپر آکسی کلورائڈ اور نیم تیل کا احتیاطی لیپ۔",
    "medicines": [
      {
        "brand": "Bavistin",
        "active": "Carbendazim 50%",
        "dosage": "250 گرام فی 100 لیٹر پانی",
        "method": "سپرے",
        "withholding_period_days": 14,
        "suppliers": [
          "BASF"
        ],
        "estimated_price_pkr": "Rs. 850 - 1,100",
        "tank_dosage_20l": "50 گرام فی 20 لیٹر ڈرمکی (سیٹ / شاخ ٹریٹمنٹ)"
      },
      {
        "brand": "Amistar Top",
        "active": "Azoxystrobin + Difenoconazole",
        "dosage": "100 ملی لیٹر فی 100 لیٹر پانی",
        "method": "سپرے",
        "withholding_period_days": 14,
        "suppliers": [
          "Syngenta"
        ],
        "estimated_price_pkr": "Rs. 2,200 - 2,700",
        "tank_dosage_20l": "20 ملی لیٹر فی 20 لیٹر ڈرمکی"
      }
    ],
    "prevention": "باغ میں ہوا کی گزرگاہ کے لیے کانٹ چھانٹ کریں اور بارش کے فوراً بعد سپرے کریں۔",
    "severity": "شدید (High Risk)",
    "emergency_action": "بور (Blossom) اور نئی شاخوں پر کالے دھبے دیکھتے ہی فوری حفاظتی فنجی سائیڈ سپرے کریں۔",
    "spray_conditions": "بور نکلنے سے پہلے اور پھل بنتے وقت ٹھنڈے اوقات میں سپرے کریں۔",
    "fertilizer_adjustment": "پوٹاش کھاد کا استعمال پھل کی جلد کو مضبوط اور بیماری سے پاک بناتا ہے۔"
  },
  "sugarcane_red_rot": {
    "name_ur": "گنے کی ریڈ رَاٹ (سرخ گلاؤ)",
    "name_en": "Sugarcane Red Rot",
    "treatment_summary": "صحت مند سیٹ (بیج) کا انتخاب اور کاشت سے پہلے سیٹ ٹریٹمنٹ ضروری ہے۔",
    "withholding_period_days": 30,
    "organic_alternative": "بیج کو گرم پانی (52 ڈگری سینٹی گریڈ) میں 30 منٹ تک ڈبو کر کاشت کریں۔",
    "medicines": [
      {
        "brand": "Bavistin",
        "active": "Carbendazim 50%",
        "dosage": "250 گرام فی 100 لیٹر پانی",
        "method": "سیٹ ٹریٹمنٹ",
        "withholding_period_days": 30,
        "suppliers": [
          "BASF"
        ],
        "estimated_price_pkr": "Rs. 850 - 1,100",
        "tank_dosage_20l": "50 گرام فی 20 لیٹر ڈرمکی (سیٹ ٹریٹمنٹ)"
      },
      {
        "brand": "Topsin-M 70WP",
        "active": "Thiophanate Methyl 70%",
        "dosage": "250 گرام فی 100 لیٹر پانی",
        "method": "سیٹ ٹریٹمنٹ",
        "withholding_period_days": 30,
        "suppliers": [
          "Nippon/Local"
        ],
        "estimated_price_pkr": "Rs. 1,150 - 1,500",
        "tank_dosage_20l": "50 گرام فی 20 لیٹر ڈرمکی (سیٹ ٹریٹمنٹ)"
      }
    ],
    "prevention": "مزاحم اقسام کاشت کریں، متاثرہ کھیت کی گنڈیریوں کو بیج کے طور پر استعمال نہ کریں اور فصل کی گردش اپنائیں۔",
    "severity": "انتہائی شدید (Critical)",
    "emergency_action": "سوکھے اور لال گنے فورا جڑ سے اکھاڑ کر جلا دیں تاکہ مٹی اور پانی کے ذریعے پورے کھیت میں نہ پھیلے۔",
    "spray_conditions": "فصل کھڑی ہونے پر سپرے کا اثر کم ہوتا ہے؛ بیماری والے ٹکڑوں کو الگ تھلگ کریں۔",
    "fertilizer_adjustment": "متاثرہ کھیت میں پانی کھڑا نہ ہونے دیں اور پوٹاش کھاد کا تناسب بڑھائیں۔"
  },
  "maize_northern_leaf_blight": {
    "name_ur": "مکئی کا پتا جھلساؤ (ناردرن کارن لیف بلائیٹ)",
    "name_en": "Maize Northern Leaf Blight",
    "treatment_summary": "پتوں پر سگار نما بھورے لمبے دھبے ظاہر ہوتے ہی فولیئر فنجی سائیڈ سپرے کریں۔ 100 تا 120 لیٹر پانی فی ایکڑ استعمال کریں۔",
    "withholding_period_days": 21,
    "organic_alternative": "نیم کا تیل 5 ملی لیٹر فی لیٹر پانی میں ملا کر پتوں پر چھڑکاؤ کریں اور نائٹروجن کی حد سے زیادہ مقدار سے پرہیز کریں۔",
    "medicines": [
      {
        "brand": "Nativo 75WG",
        "active": "Tebuconazole 50% + Trifloxystrobin 25%",
        "dosage": "80 تا 100 گرام فی ایکڑ",
        "method": "فولیئر سپرے (100L پانی)",
        "withholding_period_days": 21,
        "suppliers": [
          "Bayer"
        ],
        "estimated_price_pkr": "Rs. 1,800 - 2,400",
        "tank_dosage_20l": "16 تا 20 گرام فی 20 لیٹر ڈرمکی (5 ڈرمکیاں فی ایکڑ)"
      },
      {
        "brand": "Tilt 250EC / Bumper",
        "active": "Propiconazole 25%",
        "dosage": "200 ملی لیٹر فی ایکڑ",
        "method": "فولیئر سپرے",
        "withholding_period_days": 28,
        "suppliers": [
          "Syngenta",
          "FMC"
        ],
        "estimated_price_pkr": "Rs. 1,300 - 1,700",
        "tank_dosage_20l": "40 ملی لیٹر فی 20 لیٹر ڈرمکی (5 ڈرمکیاں فی ایکڑ)"
      },
      {
        "brand": "Score 250EC / Amistar Top",
        "active": "Difenoconazole 25%",
        "dosage": "125 تا 150 ملی لیٹر فی ایکڑ",
        "method": "فولیئر سپرے",
        "withholding_period_days": 14,
        "suppliers": [
          "Syngenta"
        ],
        "estimated_price_pkr": "Rs. 2,100 - 2,600",
        "tank_dosage_20l": "25 تا 30 ملی لیٹر فی 20 لیٹر ڈرمکی (5 ڈرمکیاں فی ایکڑ)"
      }
    ],
    "prevention": "بیماری سے پاک تصدیق شدہ ہائبرڈ بیج (جیسے Pioneer، Monsanto/Bayer) استعمال کریں، پچھلی فصل کی باقیات گہرا ہل چلا کر زمین میں دبائیں۔",
    "severity": "درمیانہ تا شدید (Moderate to High)",
    "emergency_action": "فوری طور پر نائٹروجن (یوریا) کھاد بند کریں اور اگلے 24 گھنٹے میں پہلا سسٹمک فنجی سائیڈ سپرے کریں۔",
    "spray_conditions": "صبح 9 بجے سے پہلے یا عصر کے بعد سپرے کریں۔ بارش کے بعد جب پتے سوکھ جائیں تو بہترین اثر ملتا ہے۔",
    "fertilizer_adjustment": "یوریا فوری روکیں؛ 2 کلو فی ایکڑ پوٹاشیم نائٹریٹ کا سپرے کریں تاکہ فنگس کے خلاف قوت مدافعت پیدا ہو۔"
  },
  "maize_fall_armyworm": {
    "name_ur": "مکئی کی لشکری سنڈی (فال آرمی ورم)",
    "name_en": "Maize Fall Armyworm",
    "treatment_summary": "مکئی کی گوبھ (Whorl) میں سنڈی کے فضلے اور پتوں پر چھلنی سوراخ دیکھتے ہی فوری کیڑے مار سپرے یا دانے دار زہر گوبھ میں ڈالیں۔",
    "withholding_period_days": 14,
    "organic_alternative": "گوبھ کے اندر باریک ریت اور لکڑی کی راکھ 50:50 ڈالیں یا نیم کے بیج کا عرق (5%) سپرے کریں۔",
    "medicines": [
      {
        "brand": "Coragen 20SC",
        "active": "Chlorantraniliprole 20%",
        "dosage": "50 ملی لیٹر فی ایکڑ",
        "method": "گوبھ پر فوکسڈ سپرے",
        "withholding_period_days": 14,
        "suppliers": [
          "FMC"
        ],
        "estimated_price_pkr": "Rs. 1,950 - 2,500",
        "tank_dosage_20l": "10 ملی لیٹر فی 20 لیٹر ڈرمکی (5 ڈرمکیاں فی ایکڑ)"
      },
      {
        "brand": "Match 050EC / Radiant 120SC",
        "active": "Lufenuron 5% / Spinetoram 12%",
        "dosage": "200 ملی لیٹر (Match) یا 80 ملی لیٹر (Radiant)",
        "method": "شام کے وقت سپرے",
        "withholding_period_days": 14,
        "suppliers": [
          "Syngenta",
          "Corteva"
        ],
        "estimated_price_pkr": "Rs. 1,600 - 2,200",
        "tank_dosage_20l": "40 ملی لیٹر (Match) یا 16 ملی لیٹر (Radiant) فی 20 لیٹر ڈرمکی"
      },
      {
        "brand": "Belt 480SC",
        "active": "Flubendiamide 48%",
        "dosage": "20 تا 25 ملی لیٹر فی ایکڑ",
        "method": "فولیئر سپرے",
        "withholding_period_days": 14,
        "suppliers": [
          "Bayer"
        ],
        "estimated_price_pkr": "Rs. 1,700 - 2,100",
        "tank_dosage_20l": "4 تا 5 ملی لیٹر فی 20 لیٹر ڈرمکی (5 ڈرمکیاں فی ایکڑ)"
      }
    ],
    "prevention": "کھیت میں فیرومون ٹریپس (Pheromone Traps) فی ایکڑ 4 تا 5 لگائیں، ابتدائی مرحلے پر چڑیا کے لیے لکڑی کے ڈنڈے کھڑے کریں۔",
    "severity": "شدید (High Risk)",
    "emergency_action": "فوری طور پر سپرے کی نوزل مکئی کی گوبھ (Whorl) کے اندر ڈال کر سپرے کریں یا گوبھ میں دانے دار زہر ڈالیں، تاخیر سے سنڈی اندر گھس جائے گی۔",
    "spray_conditions": "عصر کے بعد یا شام کے وقت سپرے کریں کیونکہ سنڈی رات کو زیادہ فعال ہوتی ہے۔",
    "fertilizer_adjustment": "سنڈی کے حملے کے دوران پودے کی بحالی کے لیے امینو ایسڈز اور مائیکرو نیوٹرینٹس کا سپرے کریں۔"
  },
  "maize_stem_borer": {
    "name_ur": "مکئی کے تنے کی سنڈی (سٹیم بورر)",
    "name_en": "Maize Stem Borer",
    "treatment_summary": "پتوں پر قطار نما سوراخ اور تنے میں سوراخ نظر آنے پر کاربوفیوران یا فیپرونل کے دانے گوبھ میں ڈالیں۔",
    "withholding_period_days": 21,
    "organic_alternative": "ٹرائیکوگراما (Trichogramma) کارڈز فی ایکڑ 3 تا 4 لگائیں جو سنڈی کے انڈوں کو ختم کرتے ہیں۔",
    "medicines": [
      {
        "brand": "Regent 0.4G / Furadan 3G",
        "active": "Fipronil 0.4% / Carbofuran 3%",
        "dosage": "6 تا 8 کلوگرام فی ایکڑ",
        "method": "پودوں کی گوبھ میں دانے ڈالیں",
        "withholding_period_days": 28,
        "suppliers": [
          "BASF",
          "FMC"
        ],
        "estimated_price_pkr": "Rs. 1,200 - 1,650",
        "tank_dosage_20l": "گوبھ میں 1 سے 2 چٹکی فی پودا دانے ڈالیں"
      },
      {
        "brand": "Virtako 40WG",
        "active": "Chlorantraniliprole 20% + Thiamethoxam 20%",
        "dosage": "40 گرام فی ایکڑ",
        "method": "فولیئر سپرے",
        "withholding_period_days": 14,
        "suppliers": [
          "Syngenta"
        ],
        "estimated_price_pkr": "Rs. 2,200 - 2,800",
        "tank_dosage_20l": "8 گرام فی 20 لیٹر ڈرمکی (5 ڈرمکیاں فی ایکڑ)"
      }
    ],
    "prevention": "بوائی کے وقت بیج کو کیڑے مار زہر (Cruiser / Confidor) سے ٹریٹ کریں اور فصل کے مڈھوں کو زمین میں دبا کر روٹاویٹر چلائیں۔",
    "severity": "شدید (High Risk)",
    "emergency_action": "پودوں کی گوبھ میں سوراخ نظر آتے ہی دانے دار زہر گوبھ میں ڈالیں یا گوبھ کو ہدف بنا کر سپرے کریں۔",
    "spray_conditions": "صبح یا شام کے پرسکون اوقات میں سپرے کریں۔",
    "fertilizer_adjustment": "پودوں کی مضبوط نشوونما کے لیے متوازن کھاد دیں، نائٹروجن کی زیادتی سے تنا نرم ہوتا ہے جس سے سنڈی آسانی سے داخل ہوتی ہے۔"
  },
  "cotton_whitefly": {
    "name_ur": "کپاس کی سفید مکھی",
    "name_en": "Cotton Whitefly",
    "treatment_summary": "پتے کے نچلے حصے پر سفید مکھی اور کالک (Sooty Mold) نظر آنے پر سپرے کریں۔ 5 بالغ یا 20 بچے فی پتا معاشی نقصان کی حد (ETL) ہے۔",
    "withholding_period_days": 14,
    "organic_alternative": "تمباکو کا پانی (1 کلو تمباکو + 250 گرام صابن 100L پانی میں) یا نیم آئل 5ml/L سپرے کریں۔",
    "medicines": [
      {
        "brand": "Movento 240SC / Ulala 50WG",
        "active": "Spirotetramat 24% / Flonicamid 50%",
        "dosage": "125 ملی لیٹر (Movento) یا 60 تا 80 گرام (Ulala)",
        "method": "ہولو کون نوزل سے پتے کے نچلے حصے پر سپرے",
        "withholding_period_days": 14,
        "suppliers": [
          "Bayer",
          "UPL"
        ],
        "estimated_price_pkr": "Rs. 2,200 - 2,900",
        "tank_dosage_20l": "25 ملی لیٹر (Movento) یا 12 تا 16 گرام (Ulala) فی 20 لیٹر ڈرمکی (5 ڈرمکیاں فی ایکڑ)"
      },
      {
        "brand": "Polo 500SC / Cascade",
        "active": "Diafenthiuron 50%",
        "dosage": "200 تا 250 ملی لیٹر فی ایکڑ",
        "method": "شام کے وقت سپرے",
        "withholding_period_days": 21,
        "suppliers": [
          "Syngenta",
          "Four Brothers"
        ],
        "estimated_price_pkr": "Rs. 1,400 - 1,850",
        "tank_dosage_20l": "40 تا 50 ملی لیٹر فی 20 لیٹر ڈرمکی (5 ڈرمکیاں فی ایکڑ)"
      }
    ],
    "prevention": "کھیت میں زرد چپکنے والے کارڈز (Yellow Sticky Traps) لگائیں، نائٹروجن کا متوازن استعمال کریں اور پیلے گچھے فوری کٹوا دیں۔",
    "severity": "شدید (High Risk)",
    "emergency_action": "پتے کے نچلے حصے پر ہولو کون نوزل کا رخ نیچے سے اوپر رکھ کر سپرے کریں۔ سفید مکھی کے انڈوں اور بچوں (Nymphs) کے خاتمے والی دوا استعمال کریں۔",
    "spray_conditions": "صبح 8 بجے سے 10 بجے یا شام 4 سے 6 بجے سپرے کریں۔ شدید گرمی اور تیز ہوا میں سپرے ہرگز نہ کریں۔",
    "fertilizer_adjustment": "یوریا کا استعمال فوری روکیں؛ زیادہ نائٹروجن سے پتے نرم ہوتے ہیں اور سفید مکھی کی افزائش تیز ہوتی ہے۔ پوٹاش کا استعمال بڑھائیں۔"
  },
  "cotton_pink_bollworm": {
    "name_ur": "کپاس کی گلابی سنڈی (پنک بال ورم)",
    "name_en": "Cotton Pink Bollworm",
    "treatment_summary": "پھولوں کی گلابی حالت (Rosette Flowers) اور ڈوڈیوں میں سوراخ نظر آنے پر سپرے کریں۔ 5% ڈوڈیاں متاثر ہونا معاشی حد ہے۔",
    "withholding_period_days": 14,
    "organic_alternative": "بی ٹی کپاس کے علاوہ گوبھی کے پھول فیرومون ٹریپس میں پھنسائیں اور گری ہوئی ڈوڈیاں اکٹھی کر کے جلائیں۔",
    "medicines": [
      {
        "brand": "Delegate 250WG / Proclaim 1.9EC",
        "active": "Spinetoram 25% / Emamectin Benzoate 1.9%",
        "dosage": "40 تا 50 گرام (Delegate) یا 200 تا 250 ملی لیٹر (Proclaim)",
        "method": "غروب آفتاب کے قریب باریک نوزل سپرے",
        "withholding_period_days": 14,
        "suppliers": [
          "Corteva",
          "Syngenta"
        ],
        "estimated_price_pkr": "Rs. 1,800 - 2,600",
        "tank_dosage_20l": "8 تا 10 گرام (Delegate) یا 40 تا 50 ملی لیٹر (Proclaim) فی 20 لیٹر ڈرمکی"
      },
      {
        "brand": "Steward 150SC",
        "active": "Indoxacarb 15%",
        "dosage": "150 تا 175 ملی لیٹر فی ایکڑ",
        "method": "فولیئر سپرے",
        "withholding_period_days": 14,
        "suppliers": [
          "FMC"
        ],
        "estimated_price_pkr": "Rs. 1,700 - 2,200",
        "tank_dosage_20l": "30 تا 35 ملی لیٹر فی 20 لیٹر ڈرمکی (5 ڈرمکیاں فی ایکڑ)"
      }
    ],
    "prevention": "جیننگ فیکٹریوں کے قریب بیجوں کو فیومیگیٹ کریں، فصل کی باقیات میں لکڑیاں دھوپ میں پھیلائیں تاکہ سنڈی مر جائے۔",
    "severity": "انتہائی شدید (Critical)",
    "emergency_action": "گلابی پھول (Rosette flowers) اور گری ہوئی ڈوڈیاں اکٹھی کر کے تلف کریں اور غروب آفتاب کے وقت فورا سپرے کریں۔",
    "spray_conditions": "بالکل شام کے وقت (غروب آفتاب) سپرے کریں کیونکہ پروانے شام کو فعال ہوتے ہیں۔",
    "fertilizer_adjustment": "پودوں کو حد سے زیادہ سرسبز اور گھنا نہ کریں تاکہ ہوا اور دھوپ تلے تک پہنچ سکے، جس سے کیڑے کو چھپنے کی جگہ نہ ملے۔"
  },
  "rice_bacterial_leaf_blight": {
    "name_ur": "دھان کا بیکٹیریل پتوں کا جھلساؤ (BLB)",
    "name_en": "Rice Bacterial Leaf Blight",
    "treatment_summary": "پتوں کے کناروں سے پیلاہٹ اور لہر دار سوکھا پن شروع ہو تو پانی کی نکاسی کریں اور نائٹروجن کھاد فوری روک دیں۔",
    "withholding_period_days": 14,
    "organic_alternative": "کھیت کا پانی بدلیں، 5 کلو چونا فی ایکڑ کھڑے پانی میں ڈالیں اور تازہ کنویں کا پانی لگائیں۔",
    "medicines": [
      {
        "brand": "Cuprocaffaro / Champion 77WP",
        "active": "Copper Oxychloride 50% / Copper Hydroxide",
        "dosage": "500 تا 600 گرام فی ایکڑ",
        "method": "فولیئر سپرے (120L پانی)",
        "withholding_period_days": 14,
        "suppliers": [
          "Four Brothers",
          "Aglet"
        ],
        "estimated_price_pkr": "Rs. 1,100 - 1,500",
        "tank_dosage_20l": "100 تا 120 گرام فی 20 لیٹر ڈرمکی (5 ڈرمکیاں فی ایکڑ)"
      },
      {
        "brand": "Kasumin 2L",
        "active": "Kasugamycin 2%",
        "dosage": "300 تا 400 ملی لیٹر فی ایکڑ",
        "method": "فولیئر سپرے",
        "withholding_period_days": 21,
        "suppliers": [
          "Arysta / UPL"
        ],
        "estimated_price_pkr": "Rs. 1,400 - 1,900",
        "tank_dosage_20l": "60 تا 80 ملی لیٹر فی 20 لیٹر ڈرمکی (5 ڈرمکیاں فی ایکڑ)"
      }
    ],
    "prevention": "پوٹاش کھاد (SOP) لازمی دیں تاکہ پودے کا مدافعتی نظام مضبوط ہو، اور متاثرہ کھیت کا پانی دوسرے کھیت میں نہ جانے دیں۔",
    "severity": "شدید (High Risk)",
    "emergency_action": "کھیت سے کھڑا پانی فوری نکالیں! متاثرہ کھیت کا پانی دوسرے کھیت میں نہ جانے دیں، اور نائٹروجن (یوریا) کھاد فوراً بند کریں۔",
    "spray_conditions": "سپرے صبح سویرے یا شام کے وقت کریں، تپتی دھوپ میں کاپر والے سپرے سے پتے جھلس سکتے ہیں۔",
    "fertilizer_adjustment": "یوریا قطعی بند! پوٹاش (SOP) 12.5 کلو فی ایکڑ کھاد دیں جو بیکٹیریا کے خلاف قدرتی ڈھال بناتی ہے۔"
  },
  "rice_stem_borer": {
    "name_ur": "دھان کے تنے کی سنڈی (سفید سٹے / ڈیڈ ہارٹ)",
    "name_en": "Rice Stem Borer",
    "treatment_summary": "پنیری منتقلی کے 25 تا 35 دن بعد ڈیڈ ہارٹ یا نثار کے وقت سفید سٹے (Whitehead) نظر آنے پر دانے دار زہر فلڈ کریں۔",
    "withholding_period_days": 28,
    "organic_alternative": "پنیری لگاتے وقت پودوں کے اوپری سرے کاٹ کر تلف کریں جہاں تنے کی سنڈی کے انڈے ہوتے ہیں۔",
    "medicines": [
      {
        "brand": "Padan 4G / Cartap",
        "active": "Cartap Hydrochloride 4%",
        "dosage": "9 کلوگرام فی ایکڑ",
        "method": "کھڑے پانی میں چھٹا دیں",
        "withholding_period_days": 28,
        "suppliers": [
          "Takeda / Ali Akbar"
        ],
        "estimated_price_pkr": "Rs. 1,400 - 1,800",
        "tank_dosage_20l": "کھڑے پانی میں چھٹا دیں (ڈرمکی سپرے نہیں)"
      },
      {
        "brand": "Ferterra 0.4G / Regent 0.4G",
        "active": "Chlorantraniliprole 0.4% / Fipronil 0.4%",
        "dosage": "4 کلوگرام (Ferterra) یا 6 کلو (Regent)",
        "method": "کھڑے پانی میں چھٹا دیں",
        "withholding_period_days": 21,
        "suppliers": [
          "FMC",
          "BASF"
        ],
        "estimated_price_pkr": "Rs. 1,800 - 2,400",
        "tank_dosage_20l": "کھڑے پانی میں چھٹا دیں (ڈرمکی سپرے نہیں)"
      }
    ],
    "prevention": "دھان کے مڈھوں کو گہرا ہل چلا کر زمین میں ملائیں تاکہ سنڈی کے پیوپے تلف ہو سکیں۔",
    "severity": "شدید (High Risk)",
    "emergency_action": "پتوں پر سنڈی کے انڈوں کے گچھے نظر آنے یا ڈیڈ ہارٹ بننے پر فورا دانے دار زہر کھڑے پانی میں ڈالیں یا گوبھ پر سپرے کریں۔",
    "spray_conditions": "دانے دار زہر ڈالتے وقت کھیت میں 2 سے 3 انچ پانی کھڑا ہونا لازمی ہے۔",
    "fertilizer_adjustment": "متوازن کھاد دیں، پنیری منتقلی کے بعد وقت پر زنک اور فاسفورس کی ضرورت پوری کریں۔"
  },
  "chilli_anthracnose": {
    "name_ur": "مرچ کا اینتھراکنوز (پھل کا سڑاؤ و ڈائی بیک)",
    "name_en": "Chilli Anthracnose / Fruit Rot",
    "treatment_summary": "مرچ کے پھل پر گول دھنسے ہوئے دھبے اور شاخوں کا اوپر سے سوکھنا (Dieback) نظر آنے پر فوری فنجی سائیڈ سپرے کریں۔",
    "withholding_period_days": 7,
    "organic_alternative": "نیم کا تیل 5ml/L + بیکنگ سوڈا 3 گرام فی لیٹر پانی ملا کر ہر 7 دن بعد سپرے کریں۔",
    "medicines": [
      {
        "brand": "Amistar Top / Nativo 75WG",
        "active": "Azoxystrobin + Difenoconazole / Tebuconazole + Trifloxystrobin",
        "dosage": "200 ملی لیٹر (Amistar) یا 80 گرام (Nativo)",
        "method": "فولیئر سپرے",
        "withholding_period_days": 7,
        "suppliers": [
          "Syngenta",
          "Bayer"
        ],
        "estimated_price_pkr": "Rs. 2,100 - 2,700",
        "tank_dosage_20l": "40 ملی لیٹر (Amistar) یا 16 گرام (Nativo) فی 20 لیٹر ڈرمکی (5 ڈرمکیاں فی ایکڑ)"
      },
      {
        "brand": "Antracol 70WP / Score",
        "active": "Propineb 70% / Difenoconazole",
        "dosage": "500 گرام (Antracol) یا 125ml (Score)",
        "method": "فولیئر سپرے",
        "withholding_period_days": 10,
        "suppliers": [
          "Bayer",
          "Syngenta"
        ],
        "estimated_price_pkr": "Rs. 1,300 - 1,750",
        "tank_dosage_20l": "100 گرام (Antracol) یا 25 ملی لیٹر (Score) فی 20 لیٹر ڈرمکی (5 ڈرمکیاں فی ایکڑ)"
      }
    ],
    "prevention": "پھل چنائی کے فوراً بعد سپرے کریں، زیادہ نمی والے کھیتوں میں نالیوں کے ذریعے پانی لگائیں، اور بیمار پھل الگ تلف کریں۔",
    "severity": "شدید (High Risk)",
    "emergency_action": "متاثرہ مرچیں توڑ کر کھیت سے دور دفن کریں اور فوری فنجی سائیڈ سپرے کریں۔",
    "spray_conditions": "بارش کے بعد خشک موسم میں سپرے کریں تاکہ پھل پر فنگس نہ پھیلے۔",
    "fertilizer_adjustment": "پوٹاش اور کیلشیم کا سپرے پھل کی جلد کو موٹا اور داغوں سے محفوظ بناتا ہے۔"
  },
  "onion_purple_blotch": {
    "name_ur": "پیاز کا جامنی دھبہ (پرپل بلاچ)",
    "name_en": "Onion Purple Blotch",
    "treatment_summary": "پیاز کے پتوں پر بیضوی جامنی اور بھورے نشان ظاہر ہونے پر فوری سپرے کریں، ورنہ پتے درمیان سے ٹوٹ کر گر جاتے ہیں۔",
    "withholding_period_days": 14,
    "organic_alternative": "لکڑی کی چھنی ہوئی راکھ صبح کے وقت شبنم کے دوران پتوں پر چھڑکیں۔",
    "medicines": [
      {
        "brand": "Daconil 75WP / Bravo",
        "active": "Chlorothalonil 75%",
        "dosage": "400 تا 500 گرام فی ایکڑ",
        "method": "فولیئر سپرے (چپکنے والے سٹیکر کے ساتھ)",
        "withholding_period_days": 14,
        "suppliers": [
          "Syngenta"
        ],
        "estimated_price_pkr": "Rs. 1,500 - 1,950",
        "tank_dosage_20l": "80 تا 100 گرام فی 20 لیٹر ڈرمکی (5 ڈرمکیاں فی ایکڑ)"
      },
      {
        "brand": "Score 250EC / Nativo",
        "active": "Difenoconazole 25% / Tebuconazole",
        "dosage": "125 تا 150 ملی لیٹر (Score)",
        "method": "فولیئر سپرے",
        "withholding_period_days": 14,
        "suppliers": [
          "Syngenta",
          "Bayer"
        ],
        "estimated_price_pkr": "Rs. 1,900 - 2,500",
        "tank_dosage_20l": "25 تا 30 ملی لیٹر فی 20 لیٹر ڈرمکی (5 ڈرمکیاں فی ایکڑ)"
      }
    ],
    "prevention": "پیاز کے پتوں پر موم کی تہہ ہوتی ہے اس لیے سپرے میں شیمپو یا ایگری سٹیکر (Sticker) لازمی شامل کریں۔ پیاز اور لہسن کی فصلیں قریب نہ لگائیں۔",
    "severity": "درمیانہ تا شدید (Moderate to High)",
    "emergency_action": "پتوں پر ارغوانی دھبے نظر آتے ہی فنجی سائیڈ کے ساتھ اسٹیکر (Sticker / Spreader) ملا کر سپرے کریں۔",
    "spray_conditions": "پیاز کے چکنوں پتوں پر دوا ٹھہرانے کے لیے اسٹیکر یا سرف کا قطرہ ملا کر شام کو سپرے کریں۔",
    "fertilizer_adjustment": "پیاز کی گنڈی بنتے وقت نائٹروجن بند کر دیں اور پوٹاش کھاد کا استعمال کریں۔"
  },
  "rice_sheath_blight": {
    "name_ur": "دھان کا شیتھ بلائٹ (تنے کا جھلساؤ)",
    "name_en": "Rice Sheath Blight",
    "severity": "شدید (High Risk)",
    "emergency_action": "کھیت سے کھڑا پانی فوری طور پر نکالیں یا سطح کم کریں تاکہ نمی گھٹ سکے، اور نائٹروجن (یوریا) کھاد کا استعمال فوراً بند کریں۔",
    "spray_conditions": "صبح شبنم سوکھنے کے بعد یا عصر کے وقت سپرے کریں۔ نوزل کا رخ پودے کے نچلے تنے اور غلاف (Sheath) کی طرف رکھیں جہاں فنگس ہوتی ہے۔",
    "fertilizer_adjustment": "یوریا کھاد فوری روکیں۔ پوٹاش (SOP) کا استعمال پودے کے خلیات کو مضبوط کرتا ہے اور فنگس کے خلاف قدرتی ڈھال بناتا ہے۔",
    "treatment_summary": "پودے کے نچلے غلاف پر پانی کی سطح کے قریب بیضوی سرمئی یا بھورے دھبے نظر آتے ہی فوری فنجی سائیڈ سپرے کریں۔",
    "withholding_period_days": 14,
    "organic_alternative": "کھیت کا پانی خشک کر کے دھوپ لگائیں اور نیم کے بیج کا عرق (5%) یا ٹرائیکوڈرما بائیو فنجی سائیڈ کا استعمال کریں۔",
    "medicines": [
      {
        "brand": "Amistar Top",
        "active": "Azoxystrobin 20% + Difenoconazole 12.5%",
        "dosage": "200 ملی لیٹر فی ایکڑ",
        "tank_dosage_20l": "40 ملی لیٹر فی 20 لیٹر ڈرمکی (5 ڈرمکیاں فی ایکڑ)",
        "water_volume": "100-120 لیٹر پانی",
        "method": "نچلے تنے پر فوکسڈ سپرے",
        "withholding_period_days": 14,
        "suppliers": [
          "Syngenta"
        ],
        "estimated_price_pkr": "Rs. 2,200 - 2,700"
      },
      {
        "brand": "Nativo 75WG",
        "active": "Tebuconazole 50% + Trifloxystrobin 25%",
        "dosage": "80 تا 100 گرام فی ایکڑ",
        "tank_dosage_20l": "16 تا 20 گرام فی 20 لیٹر ڈرمکی (5 ڈرمکیاں فی ایکڑ)",
        "water_volume": "100-120 لیٹر پانی",
        "method": "فولیئر سپرے",
        "withholding_period_days": 21,
        "suppliers": [
          "Bayer"
        ],
        "estimated_price_pkr": "Rs. 1,800 - 2,400"
      },
      {
        "brand": "Validacin / Sheathmar",
        "active": "Validamycin 3% L",
        "dosage": "500 ملی لیٹر فی ایکڑ",
        "tank_dosage_20l": "100 ملی لیٹر فی 20 لیٹر ڈرمکی (5 ڈرمکیاں فی ایکڑ)",
        "water_volume": "100-120 لیٹر پانی",
        "method": "تنے کے نچلے حصے پر سپرے",
        "withholding_period_days": 14,
        "suppliers": [
          "Swat Agro",
          "Local/Generic"
        ],
        "estimated_price_pkr": "Rs. 950 - 1,350"
      }
    ],
    "prevention": "پودوں کے درمیان مناسب فاصلہ رکھیں تاکہ ہوا اور دھوپ تلے تک پہنچ سکے، یوریا کھاد متوازن رکھیں اور فصل کی باقیات کو گہرا ہل چلا کر مٹی میں دبائیں۔"
  }
};

export const OFFLINE_DISEASE_CATALOG = Object.entries(AGRONOMY_DATABASE)
  .filter(([k]) => k !== 'note')
  .map(([key, detail], idx) => ({
    id: idx + 1,
    key,
    name_en: detail.name_en || key,
    name_ur: detail.name_ur || key,
    has_local_remedy: true,
    model_name: 'مقامی تصدیق شدہ زرعی ڈیٹابیس',
    detail
  }));

export function getOfflineDisease(keyOrCrop) {
  if (!keyOrCrop) return null;
  const raw = keyOrCrop.toString().trim().toLowerCase();
  if (AGRONOMY_DATABASE[raw]) return { key: raw, detail: AGRONOMY_DATABASE[raw], ...AGRONOMY_DATABASE[raw] };

  for (const [k, v] of Object.entries(AGRONOMY_DATABASE)) {
    if (k === 'note') continue;
    if (k.includes(raw) || raw.includes(k)) return { key: k, detail: v, ...v };
    if (v.name_ur && (v.name_ur.includes(raw) || raw.includes(v.name_ur))) return { key: k, detail: v, ...v };
    if (v.name_en && (v.name_en.toLowerCase().includes(raw) || raw.includes(v.name_en.toLowerCase()))) return { key: k, detail: v, ...v };
  }
  return null;
}

export function searchOfflineCatalog(query) {
  if (!query || !query.trim()) return OFFLINE_DISEASE_CATALOG;
  const q = query.trim().toLowerCase();
  return OFFLINE_DISEASE_CATALOG.filter(item => {
    return (
      item.key.includes(q) ||
      (item.name_ur && item.name_ur.includes(q)) ||
      (item.name_en && item.name_en.toLowerCase().includes(q))
    );
  });
}

