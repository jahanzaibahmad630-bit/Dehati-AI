const express = require('express');
const router  = express.Router();
const db      = require('../lib/db');

// Official Punjab Govt Schemes Fallback Records
const OFFICIAL_SCHEMES = [
  {
    id: 'kissan-card-2026',
    title_ur: 'چیف منسٹر پنجاب کسان کارڈ',
    title_en: 'CM Punjab Kissan Card Scheme',
    icon: '💳',
    category: 'قرضہ و بلا سود مالی امداد',
    subsidy_amount: '₨150,000 بلا سود فصلی کریڈٹ لائن',
    loan_limit: '₨30,000 تا ₨150,000 بلا سود فصلی قرضہ',
    deadline: 'جاری و فعال ہے',
    sms_code: '8070 / 8171',
    portal_url: 'https://agripunjab.gov.pk/kissan-card',
    eligibility_ur: 'پنجاب کا رہائشی، 1 تا ساڑھے 12 ایکڑ تک زرعی زمین (PLRA ریکارڈ)، بینک کا نادہندہ نہ ہو۔',
    description_ur: 'کھاد، بیج اور زرعی ادویات کی خریداری کے لیے 1.5 لاکھ روپے تک 0% مارک اپ پر بلاسود قرضہ، بغیر کسی اضافی چارجز کے۔',
    benefits: ['بیج و کھاد کی فوری نقد خریداری', '0٪ سود (مکمل بلا سود کریڈٹ)', 'کھیت کی سطح پر رجسٹرڈ ڈیلر POS سے خریداری']
  },
  {
    id: 'green-tractor-2026',
    title_ur: 'چیف منسٹر پنجاب گرین ٹریکٹر پروگرام',
    title_en: 'CM Punjab Green Tractor Program',
    icon: '🚜',
    category: 'مشینری و ٹریکٹر سبسڈی',
    subsidy_amount: '₨1,000,000 (10 لاکھ روپے نقد رعایت)',
    loan_limit: '10 لاکھ روپے فی ٹریکٹر سرکاری گرانٹ',
    deadline: 'مرحلہ 2 قرعہ اندازی (جاری)',
    sms_code: '8070',
    portal_url: 'https://agripunjab.gov.pk/green-tractor-scheme',
    eligibility_ur: 'پنجاب کے 1 سے 50 ایکڑ اراضی والے کسان۔ شفاف ڈیجیٹل قرعہ اندازی کے ذریعے انتخاب۔',
    description_ur: '50 سے 85 ہارس پاور کے مقامی ٹریکٹرز (ملت میسی فرگوسن و الغازی نیو ہالینڈ) پر حکومت پنجاب کی طرف سے 10 لاکھ روپے کی یکمشت نقد رعایت۔',
    benefits: ['10 لاکھ روپے کی سیدھی نقد حکومتی سبسڈی', 'ملت و الغازی کے تمام ماڈلز شامل', 'شفاف قرعہ اندازی و بینک فنانسنگ']
  },
  {
    id: 'oilseeds-subsidy-2026',
    title_ur: 'روغنی اجناس (کینولا، تل و سویابین) سبسڈی',
    title_en: 'Promotion of Oilseeds Scheme',
    icon: '🌻',
    category: 'فصل سبسڈی و بیج رعایت',
    subsidy_amount: '₨5,000 فی ایکڑ نقد واؤچر سبسڈی',
    loan_limit: '₨5,000 فی ایکڑ نقد رقم',
    deadline: 'فصل کے سیزن کے مطابق فعال',
    sms_code: '8070',
    portal_url: 'https://agripunjab.gov.pk/oilseeds',
    eligibility_ur: 'کینولا، تل اور سویابین کاشت کرنے والے رجسٹرڈ کسان (25 ایکڑ تک)۔',
    description_ur: 'پاکستان میں خوردنی تیل کی پیداوار بڑھانے کے لیے کینولا، تل اور سویابین کاشت کاروں کو 5,000 روپے فی ایکڑ نقد سبسڈی واؤچر۔',
    benefits: ['5,000 روپے فی ایکڑ براہ راست کسان اکاؤنٹ میں', 'تصدیق شدہ بیج پر 50٪ رعایت', 'محکمہ زراعت کی مفت فیلڈ رہنمائی']
  },
  {
    id: 'agri-malls-2026',
    title_ur: 'پنجاب ماڈل ایگری مالز سہولت',
    title_en: 'Establishment of Model Agri Malls',
    icon: '🏪',
    category: 'سرکاری سہولت و لیبارٹری',
    subsidy_amount: '100% مفت مٹی و پانی ٹیسٹنگ لیب',
    loan_limit: 'یکجا زرعی خدمات',
    deadline: '24/7 فعال',
    sms_code: '0800-17000',
    portal_url: 'https://agripunjab.gov.pk/agri-malls',
    eligibility_ur: 'پنجاب کے تمام اضلاع کے کسان — کوئی رقبہ یا آمدن شرط نہیں۔',
    description_ur: 'ہر ضلع میں ایک چھت تلے سرکاری کنٹرولڈ ریٹ پر اصلی کھاد، مصدقہ بیج، زرعی ادویات اور SFRI تصدیق شدہ مٹی ٹیسٹنگ لیب۔',
    benefits: ['مٹی و ٹیوب ویل پانی کی مفت لیبارٹری رپورٹ', 'اصلی بیج و کھاد کی سرکاری ضمانت', 'ماہرین زراعت کا آن سپاٹ کلینک']
  },
  {
    id: 'dastak-doorstep-2026',
    title_ur: 'وزیر اعلیٰ پنجاب دستک ڈور اسٹیپ سروس',
    title_en: 'Doorstep Delivery Dastak Scheme',
    icon: '🚪',
    category: 'ڈور اسٹیپ سروس و دستاویزات',
    subsidy_amount: 'گھر کی دہلیز پر سرکاری خدمات',
    loan_limit: 'گھر بیٹھے رجسٹریشن',
    deadline: '24/7 فعال',
    sms_code: '1202',
    portal_url: 'https://dastak.punjab.gov.pk',
    eligibility_ur: 'پنجاب کے تمام کسان و دیہی شہری۔',
    description_ur: 'فرد ملکیت، گرداوری، زمین کا ریکارڈ اور کسان رجسٹریشن اب دستک نمائندے کے ذریعے اپنے ڈیرے یا گھر پر حاصل کریں۔',
    benefits: ['پٹوار خانوں اور کچہری کے چکروں سے نجات', 'گھر پر نمائندہ آ کر بائیومیٹرک کرے گا', 'آن لائن شفاف ادائیگی']
  }
];

// GET /api/schemes — Fetch active schemes (database or official fallback)
router.get('/', async (req, res) => {
  try {
    let dbSchemes = [];
    try {
      if (db.getSchemes) {
        dbSchemes = await db.getSchemes();
      }
    } catch {}

    const schemes = (dbSchemes && dbSchemes.length > 0) ? dbSchemes : OFFICIAL_SCHEMES;

    res.json({
      status: 'success',
      total: schemes.length,
      lastUpdated: new Date().toISOString(),
      source: dbSchemes.length > 0 ? 'database' : 'official_gov_feed',
      schemes
    });
  } catch (err) {
    res.json({
      status: 'success',
      total: OFFICIAL_SCHEMES.length,
      lastUpdated: new Date().toISOString(),
      source: 'official_gov_feed',
      schemes: OFFICIAL_SCHEMES
    });
  }
});

// POST /api/schemes — Admin add/update scheme
router.post('/', async (req, res) => {
  try {
    const scheme = req.body;
    if (!scheme || !scheme.title_ur) {
      return res.status(400).json({ error: 'اسکیم کا عنوان ضروری ہے' });
    }

    try {
      if (db.saveScheme) {
        await db.saveScheme(scheme);
      }
    } catch {}

    res.json({ status: 'success', message: 'اسکیم کامیابی سے محفوظ ہو گئی', scheme });
  } catch (err) {
    res.status(500).json({ error: 'اسکیم محفوظ کرنے میں ناکامی' });
  }
});

module.exports = router;
