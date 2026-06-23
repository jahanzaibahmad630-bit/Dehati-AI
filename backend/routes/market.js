const express = require('express');
const router = express.Router();

const MARKET_PRICES = [
  { id: 1, nameUrdu: 'گندم', nameEn: 'Wheat', price: 1800, unit: 'من (40 کلو)', trend: 'stable', trendIcon: '→', month: 'جنوری 2026' },
  { id: 2, nameUrdu: 'باسمتی چاول', nameEn: 'Basmati Rice', price: 4200, unit: 'من (40 کلو)', trend: 'up', trendIcon: '↑', month: 'جنوری 2026' },
  { id: 3, nameUrdu: 'کپاس', nameEn: 'Cotton', price: 6500, unit: 'من (40 کلو)', trend: 'stable', trendIcon: '→', month: 'جنوری 2026' },
  { id: 4, nameUrdu: 'گنا', nameEn: 'Sugarcane', price: 425, unit: 'من (40 کلو)', trend: 'stable', trendIcon: '→', month: 'جنوری 2026' },
  { id: 5, nameUrdu: 'مکئی', nameEn: 'Maize', price: 1250, unit: 'من (40 کلو)', trend: 'down', trendIcon: '↓', month: 'جنوری 2026' },
  { id: 6, nameUrdu: 'آلو', nameEn: 'Potato', price: 1100, unit: 'من (40 کلو)', trend: 'up', trendIcon: '↑', month: 'جنوری 2026' },
  { id: 7, nameUrdu: 'ٹماٹر', nameEn: 'Tomato', price: 800, unit: 'من (40 کلو)', trend: 'down', trendIcon: '↓', month: 'جنوری 2026' },
  { id: 8, nameUrdu: 'پیاز', nameEn: 'Onion', price: 650, unit: 'من (40 کلو)', trend: 'stable', trendIcon: '→', month: 'جنوری 2026' },
  { id: 9, nameUrdu: 'مرچ', nameEn: 'Chili', price: 5500, unit: 'من (40 کلو)', trend: 'up', trendIcon: '↑', month: 'جنوری 2026' },
  { id: 10, nameUrdu: 'لہسن', nameEn: 'Garlic', price: 12000, unit: 'من (40 کلو)', trend: 'stable', trendIcon: '→', month: 'جنوری 2026' }
];

const PRICE_NOTE = 'یہ قیمتیں نمونے کے طور پر ہیں — حقیقی قیمتوں کے لیے مقامی منڈی یا AMIS Punjab (amis.pk) سے تصدیق کریں';

router.get('/', (req, res) => {
  res.json({
    prices: MARKET_PRICES,
    note: PRICE_NOTE,
    lastUpdated: new Date().toISOString()
  });
});

module.exports = router;
