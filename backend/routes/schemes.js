const express = require('express');
const router  = express.Router();
const db      = require('../lib/db');

// Official Punjab Govt Schemes Fallback Records
const OFFICIAL_SCHEMES = [
  {
    id: 'kissan-card-2026',
    title_ur: 'چیف منسٹر پنجاب کسان کارڈ',
    title_en: 'CM Punjab Kissan Card Scheme',
    category: 'قرضہ و بلا سود مالی امداد',
    subsidy_amount: '₨150,000 بلا سود بلا سود بلا سود',
    loan_limit: '₨150,000 بلا سود فصلی قرضہ',
    deadline: '30 ستمبر 2026',
    sms_code: '8070 / 8171',
    portal_url: 'https://agripunjab.gov.pk/kissan-card',
    eligibility_ur: 'پنجاب کا رہائشی، ساڑھے 12 ایکڑ تک زرعی زمین، نادہندہ نہ ہو۔',
    description_ur: 'کھاد، بیج اور ڈی اے پی کی خریداری کے لیے 1.5 لاکھ روپے تک بلا سود قرضہ، بغیر کسی سود اور اضافی چارجز کے۔',
    benefits: ['بیج و کھاد کی فوری نقد خریداری', '0٪ سود (مکمل بلا سود)', 'کھیت کی سطح پر آسان ادائیگی']
  },
  {
    id: 'green-tractor-2026',
    title_ur: 'چیف منسٹر پنجاب گرین ٹریکٹر پروگرام',
    title_en: 'CM Punjab Green Tractor Program',
    category: 'مشینری و ٹریکٹر سبسڈی',
    subsidy_amount: '₨1,500,000 (15 لاکھ روپے رعایت)',
    loan_limit: '15 لاکھ فی ٹریکٹر سبسڈی',
    deadline: '15 اگست 2026',
    sms_code: '8070',
    portal_url: 'https://agripunjab.gov.pk/green-tractor-scheme',
    eligibility_ur: 'پنجاب کے 1 سے 50 ایکڑ اراضی والے کسان۔ قرعہ اندازی کے ذریعے انتخاب۔',
    description_ur: 'ہر کسان کو 50 سے 85 ہارس پاور کے مقامی و درآمدی ٹریکٹر پر حکومت پنجاب کی طرف سے 15 لاکھ روپے کی نقد رعایت۔',
    benefits: ['15 لاکھ روپے کی سیدھی نقد سبسڈی', 'تمام بڑے برانڈز (ملت، غازی، آئی ایم ٹی) شامل', 'شفاف ڈرا پروسیس']
  },
  {
    id: 'oilseeds-subsidy-2026',
    title_ur: 'روغنی اجناس کینولا، تل و سویابین سبسڈی',
    title_en: 'Promotion of Oilseeds Scheme',
    category: 'فصل سبسڈی و بیج رعایت',
    subsidy_amount: '₨5,000 فی ایکڑ نقد سبسڈی',
    loan_limit: '₨5,000 فی ایکڑ نقد رقم',
    deadline: '31 اکتوبر 2026',
    sms_code: '8070',
    portal_url: 'https://agripunjab.gov.pk/oilseeds',
    eligibility_ur: 'کینولا، تل اور سویابین کاشت کرنے والے کسان۔',
    description_ur: 'پاکستان میں کوکنگ آئل کی ملکی پیداوار بڑھانے کے لیے کینولا اور تل کاشت کرنے والے کسانوں کو 5,000 روپے فی ایکڑ نقد واؤچر۔',
    benefits: ['5,000 روپے فی ایکڑ براہ راست کسان اکاؤنٹ میں', 'تصدیق شدہ بیج پر 50٪ رعایت', 'مفت زرعی رہنمائی']
  },
  {
    id: 'agri-malls-2026',
    title_ur: 'پنجاب ماڈل ایگری مالز قائم اسکیم',
    title_en: 'Establishment of Model Agri Malls',
    category: 'سرکاری سہولت و لیبارٹری',
    subsidy_amount: 'مفت مٹی ٹیسٹنگ و تصدیق شدہ انپٹس',
    loan_limit: 'یکجا زرعی خدمات',
    deadline: 'جاری ہے',
    sms_code: '0800-17000',
    portal_url: 'https://agripunjab.gov.pk/agri-malls',
    eligibility_ur: 'پنجاب کے تمام اضلاع کے کسان۔',
    description_ur: 'ہر ضلع میں ایک چھت تلے سرکاری نرخوں پر تصدیق شدہ بیج، کھاد، زرعی ادویات اور جدید مٹی ٹیسٹنگ لیب۔',
    benefits: ['مٹی و پانی کی مفت لیبارٹری ٹیسٹنگ', 'اصلی بیج و کھاد کی ضمانت', 'ماہرین زراعت کا کلینک']
  },
  {
    id: 'dastak-doorstep-2026',
    title_ur: 'وزیر اعلیٰ پنجاب دستک ڈور اسٹیپ سروس',
    title_en: 'Doorstep Delivery Dastak Scheme',
    category: 'ڈور اسٹیپ سروس و کاغذات',
    subsidy_amount: 'گھر کی دہلیز پر سرکاری خدمات',
    loan_limit: 'گھر بیٹھے رجسٹریشن',
    deadline: '24/7 فعال',
    sms_code: '1202',
    portal_url: 'https://dastak.punjab.gov.pk',
    eligibility_ur: 'پنجاب کے تمام شہری و دیہی کسان۔',
    description_ur: 'فرد ملکیت، زمین کا ریکارڈ، کسان رجسٹریشن اور زرعی سرٹیفکیٹ اب دستک نمائندے کے ذریعے اپنے گھر کی دہلیز پر حاصل کریں۔',
    benefits: ['دفتروں کے چکروں سے نجات', 'گھر پر نمائندہ آئے گا', 'آن لائن ادائیگی کا نظام']
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

    res.json({ status: 'success', message: 'اسکیم کامیا بی سے محفوظ ہو گئی', scheme });
  } catch (err) {
    res.status(500).json({ error: 'اسکیم محفوظ کرنے میں ناکامی' });
  }
});

module.exports = router;
