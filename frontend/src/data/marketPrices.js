// Market prices — estimated reference rates based on Punjab mandi averages (2025-26)
// ⚠️ DISCLOSURE: These are ESTIMATED/REFERENCE prices, NOT a live AMIS/government feed.
// Real-time integration requires official AMIS Punjab API access.
// These figures are updated manually and used for guidance only.

const BASE_PRICES = [
  { id: 1,  nameUrdu: 'گندم',        nameEn: 'Wheat',       base: 3900,  unit: 'من (40 کلو)', category: 'اناج' },
  { id: 2,  nameUrdu: 'باسمتی چاول', nameEn: 'Basmati',     base: 4800,  unit: 'من (40 کلو)', category: 'اناج' },
  { id: 3,  nameUrdu: 'مکئی',        nameEn: 'Maize',       base: 1800,  unit: 'من (40 کلو)', category: 'اناج' },
  { id: 4,  nameUrdu: 'کپاس',        nameEn: 'Cotton',      base: 9500,  unit: 'من (40 کلو)', category: 'نقدی فصل' },
  { id: 5,  nameUrdu: 'گنا',         nameEn: 'Sugarcane',   base: 475,   unit: 'من (40 کلو)', category: 'نقدی فصل' },
  { id: 6,  nameUrdu: 'آلو',         nameEn: 'Potato',      base: 1400,  unit: 'من (40 کلو)', category: 'سبزی' },
  { id: 7,  nameUrdu: 'ٹماٹر',       nameEn: 'Tomato',      base: 2200,  unit: 'من (40 کلو)', category: 'سبزی' },
  { id: 8,  nameUrdu: 'پیاز',        nameEn: 'Onion',       base: 1100,  unit: 'من (40 کلو)', category: 'سبزی' },
  { id: 9,  nameUrdu: 'مرچ',         nameEn: 'Chili',       base: 6500,  unit: 'من (40 کلو)', category: 'سبزی' },
  { id: 10, nameUrdu: 'لہسن',        nameEn: 'Garlic',      base: 18000, unit: 'من (40 کلو)', category: 'سبزی' },
  { id: 11, nameUrdu: 'سرسوں',       nameEn: 'Mustard',     base: 7200,  unit: 'من (40 کلو)', category: 'تیلدار' },
  { id: 12, nameUrdu: 'چنا',         nameEn: 'Chickpea',    base: 8500,  unit: 'من (40 کلو)', category: 'دالیں' },
  { id: 13, nameUrdu: 'مسور',        nameEn: 'Lentil',      base: 6800,  unit: 'من (40 کلو)', category: 'دالیں' },
  { id: 14, nameUrdu: 'DAP کھاد',   nameEn: 'DAP',         base: 10500, unit: 'بوری (50 کلو)', category: 'کھاد' },
  { id: 15, nameUrdu: 'یوریا',       nameEn: 'Urea',        base: 3900,  unit: 'بوری (50 کلو)', category: 'کھاد' },
];

// Deterministic daily variation ±3% (cosmetic, not real-time data)
function getEstimatedPrice(base) {
  const day = new Date().getDate();
  const seed = base * day;
  const variation = ((seed % 7) - 3) / 100;
  return Math.round(base * (1 + variation) / 50) * 50;
}

function getTrend(base) {
  const day = new Date().getDate();
  const seed = (base + day * 13) % 10;
  if (seed < 3) return { trend: 'up',   trendIcon: '↑', color: '#16a34a' };
  if (seed < 6) return { trend: 'down', trendIcon: '↓', color: '#dc2626' };
  return         { trend: 'stable', trendIcon: '→', color: '#92400e' };
}

// Returns estimated prices with honest disclosure
export function getLiveMarketPrices() {
  const now = new Date();
  const dateLabel = now.toLocaleDateString('ur-PK', { day: 'numeric', month: 'long', year: 'numeric' });
  return BASE_PRICES.map(item => ({
    ...item,
    price: getEstimatedPrice(item.base),
    ...getTrend(item.base),
    updatedAt: dateLabel,
    isEstimated: true  // flag so UI can show disclosure
  }));
}

export const PRICE_NOTE = '⚠️ یہ تخمینی حوالہ قیمتیں ہیں — یہ AMIS یا سرکاری منڈی کا براہ راست ڈیٹا نہیں۔ حتمی قیمت مقامی منڈی سے معلوم کریں';
