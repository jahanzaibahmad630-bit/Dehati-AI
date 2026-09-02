import { useState, useCallback } from 'react';
import { useOffline } from '../../hooks/useOffline';
import { getSavedSoilProfile } from './SoilProfile';
import InstitutionalBadge from '../ui/InstitutionalBadge';

// ─── Punjab district GPS coordinates ────────────────────────────────────────
const DISTRICTS = {
  'لاہور':       { lat: 31.5497, lon: 74.3436 },
  'فیصل آباد':  { lat: 31.4154, lon: 72.9977 },
  'ملتان':       { lat: 30.1575, lon: 71.5249 },
  'گوجرانوالہ': { lat: 32.1877, lon: 74.1945 },
  'سیالکوٹ':    { lat: 32.4945, lon: 74.5229 },
  'بہاولپور':   { lat: 29.3956, lon: 71.6836 },
  'ڈیرہ غازی خان': { lat: 30.0574, lon: 70.6335 },
  'رحیم یار خان':  { lat: 28.4202, lon: 70.2952 },
  'شیخوپورہ':   { lat: 31.7167, lon: 73.9833 },
  'سرگودھا':    { lat: 32.0836, lon: 72.6711 },
  'جھنگ':       { lat: 31.2681, lon: 72.3181 },
  'گجرات':      { lat: 32.5736, lon: 74.0796 },
  'ساہیوال':    { lat: 30.6706, lon: 73.1064 },
  'خانیوال':    { lat: 30.3012, lon: 71.9328 },
  'پاکپتن':     { lat: 30.3432, lon: 73.3832 },
  'وہاڑی':      { lat: 29.7044, lon: 72.3464 },
  'اوکاڑہ':     { lat: 30.8117, lon: 73.4535 },
  'چینیوٹ':     { lat: 31.7257, lon: 72.9773 },
  'نارووال':    { lat: 32.1020, lon: 74.8726 },
  'قصور':       { lat: 31.1160, lon: 74.3525 },
  'ننکانہ صاحب': { lat: 31.4512, lon: 73.7078 },
  'شکرگڑھ':    { lat: 32.2649, lon: 75.1491 },
  'حافظ آباد':  { lat: 32.0714, lon: 73.6877 },
  'منڈی بہاؤالدین': { lat: 32.5870, lon: 73.4694 },
  'ٹوبہ ٹیک سنگھ': { lat: 30.9680, lon: 72.4823 },
  'بھکر':       { lat: 31.6234, lon: 71.0651 },
  'لودھراں':    { lat: 29.5348, lon: 71.6338 },
  'میانوالی':   { lat: 32.5854, lon: 71.5421 },
  'لیہ':        { lat: 30.9813, lon: 70.9469 },
  'مظفرگڑھ':   { lat: 30.0723, lon: 71.1937 },
  'راجن پور':   { lat: 29.1040, lon: 70.3269 },
  'عطاک':       { lat: 33.7667, lon: 72.3600 },
  'چکوال':      { lat: 32.9327, lon: 72.8565 },
  'جہلم':       { lat: 32.9335, lon: 73.7260 },
  'راولپنڈی':   { lat: 33.5651, lon: 73.0169 },
};

// ─── 1. PESTS & INSECTS DIRECTORY (Pest Warning Punjab & CCRI Multan) ────────
const PESTS = {
  'گلابی سنڈی (Pink Bollworm)': {
    icon: '🐛', crop: 'کپاس (Cotton)',
    etl: '≥5 سنڈیاں فی 100 ٹنڈے (5% نقصان) یا 5 پروانے فی ٹریپ مسلسل 3 راتیں',
    waterPerAcre: 100, bestTime: 'شام 5 تا 7 بجے',
    products: [
      { name: 'Spinetoram 11.7% SC', brand: 'Radiant (Corteva) / FMC United', dose: 100, unit: 'ملی لیٹر', phi: 7, note: 'جدید سسٹمک سنڈی کش — فوری اثر' },
      { name: 'Chlorantraniliprole + Lambda Mix', brand: 'Coragen + Karate Mix (FMC + Syngenta)', dose: 160, unit: 'ملی لیٹر', phi: 7, note: 'انڈے اور چھوٹی سنڈی دونوں کا خاتمہ' },
      { name: 'Gamma-cyhalothrin 10% EC', brand: 'Dominex (ICI Pakistan / 4B)', dose: 100, unit: 'ملی لیٹر', phi: 7, note: 'تیز تر رابطہ زہر' },
    ]
  },
  'سفید مکھی (Whitefly)': {
    icon: '🪰', crop: 'کپاس (Cotton)',
    etl: '≥5 بالغ یا بچے فی پتہ (Pest Warning Threshold)',
    waterPerAcre: 100, bestTime: 'صبح 6-9 بجے یا شام 5-7 بجے',
    products: [
      { name: 'Spirotetramat 125ml + Biopower 250ml', brand: 'Movento + Biopower (Bayer Pakistan)', dose: 125, unit: 'ملی لیٹر', phi: 7, note: 'سفید مکھی کے بچوں اور انڈوں پر دو طرفہ سسٹمک اثر' },
      { name: 'Cyantraniliprole + Diafenthiuron', brand: 'Cyazypyr Mix + Diafenthiuron (FMC + Bayer)', dose: 300, unit: 'ملی لیٹر', phi: 7, note: 'شدید حملے کی صورت میں فوری نوک ڈاؤن' },
      { name: 'Flonicamid 50% WG', brand: 'Teppeki (ISK / Kanzo / 4B)', dose: 80, unit: 'گرام', phi: 4, note: 'رس چوسنا فوری بند — محفوظ کیمیائی گروپ' },
      { name: 'Pyriproxyfen 10% EC', brand: 'Admiral (Syngenta Pakistan) / Ali Akbar', dose: 450, unit: 'ملی لیٹر', phi: 7, note: 'آئی جی آر — اگلی نسل کی پیداوار روکتا ہے' },
    ]
  },
  'سست تیلا / امرا (Jassid)': {
    icon: '🦗', crop: 'کپاس (Cotton)',
    etl: 'نئے پتوں پر پیلاہٹ اور ہاٹ اسپاٹ میں تیزی سے اضافہ',
    waterPerAcre: 100, bestTime: 'صبح 7 تا 10 بجے',
    products: [
      { name: 'Flonicamid 50% WG', brand: 'Teppeki (ISK Biosciences / 4B)', dose: 60, unit: 'گرام', phi: 4, note: '60 گرام فی ایکڑ — سست تیلے کا حتمی کنٹرول' },
      { name: 'Dinotefuran 20% SG', brand: 'Starkle (ISK / Ali Akbar Group)', dose: 100, unit: 'گرام', phi: 7, note: 'سسٹمک اثر — دیرپا تحفظ' },
      { name: 'Isocycloseram 10% SC', brand: 'Sefina (BASF Pakistan)', dose: 80, unit: 'ملی لیٹر', phi: 7, note: 'جدید مالیکیول — ماحول دوست' },
    ]
  },
  'تھرپس (Thrips)': {
    icon: '🌿', crop: 'کپاس / مرچ (Cotton / Chilli)',
    etl: '>10 تھرپس فی پتہ اور پتوں پر چاندی جیسے چمکدار دھبے',
    waterPerAcre: 100, bestTime: 'صبح 7 تا 10 بجے',
    products: [
      { name: 'Imidacloprid 20% SL', brand: 'Confidor (Bayer) / Ali Akbar Group', dose: 175, unit: 'ملی لیٹر', phi: 14, note: 'پتوں کے اندر داخل ہو کر تحفظ دیتا ہے' },
      { name: 'Thiamethoxam 25% WG', brand: 'Actara (Syngenta Pakistan) / 4B', dose: 90, unit: 'گرام', phi: 8, note: 'متبادل گروپ — 80-100 گرام فی ایکڑ' },
    ]
  },
  'ڈسکی کاٹن بگ (Dusky Bug)': {
    icon: '🐞', crop: 'کپاس (Cotton)',
    etl: 'کھلے ہوئے ٹنڈوں پر کیڑوں کے جھنڈ اور کالی چپچپاہٹ',
    waterPerAcre: 100, bestTime: 'شام 5 تا 7 بجے',
    products: [
      { name: 'Clothianidin 20% SL', brand: 'Dantotsu (Sumitomo / Ali Akbar)', dose: 200, unit: 'ملی لیٹر', phi: 14, note: '200 مل فی ایکڑ — روئی کو داغدار ہونے سے بچائیں' },
    ]
  },
  'پیلی زنگ (Yellow/Stripe Rust)': {
    icon: '🍂', crop: 'گندم (Wheat)',
    etl: 'جھنڈے کے پتے (Flag leaf) پر پیلی پٹیاں یا 5% رقبہ متاثر',
    waterPerAcre: 100, bestTime: 'صبح 8 تا 11 بجے (شبنم سوکھنے کے بعد)',
    products: [
      { name: 'Tebuconazole 25% EC', brand: 'Folicur (Bayer) / Kanzo / Ali Akbar', dose: 450, unit: 'ملی لیٹر', phi: 25, note: 'پہلی علامت پر فوری سپرے — زنگ کا پھیلاؤ رک جائے گا' },
      { name: 'Propiconazole 25% EC', brand: 'Tilt (Syngenta) / Radar (Ali Akbar)', dose: 450, unit: 'ملی لیٹر', phi: 25, note: 'پھپھوندی کے سپورز کو تلف کرتا ہے' },
      { name: 'Azoxystrobin + Tebuconazole SC', brand: 'Amistar Top (Syngenta Pakistan)', dose: 275, unit: 'ملی لیٹر', phi: 21, note: 'حفاظتی اور علاجی دونوں خصوصیات' },
    ]
  },
  'گندم کا سست تیلا (Wheat Aphid)': {
    icon: '🦟', crop: 'گندم (Wheat)',
    etl: '≥5 تیلے فی سٹہ / بالی (دانے بننے کے مرحلے پر)',
    waterPerAcre: 100, bestTime: 'صبح 8 تا 11 بجے',
    products: [
      { name: 'Thiamethoxam 25% WG', brand: 'Actara (Syngenta Pakistan) / 4B', dose: 20, unit: 'گرام', phi: 8, note: 'صرف 20 گرام فی ایکڑ — سستے داموں فوری خاتمہ' },
      { name: 'Pymetrozine 50% WG', brand: 'Chess (Syngenta Pakistan)', dose: 70, unit: 'گرام', phi: 4, note: 'دوست کیڑوں کے لیے محفوظ' },
      { name: 'Dinotefuran 20% SG', brand: 'Starkle (ISK / Ali Akbar Group)', dose: 90, unit: 'گرام', phi: 7, note: 'دانے بھرنے کے وقت محفوظ' },
    ]
  },
  'چاول کا جھلساؤ (Rice Blast)': {
    icon: '🍚', crop: 'چاول باسمتی (Rice)',
    etl: 'پتوں پر آنکھ نما داغ یا گوب کی حالت پر گردن کا جھلساؤ خطرہ',
    waterPerAcre: 100, bestTime: 'صبح 6 تا 9 بجے',
    products: [
      { name: 'Tricyclazole 75% WP', brand: 'Beam (Syngenta) / Ali Akbar Group', dose: 225, unit: 'گرام', phi: 21, note: 'گوب کے وقت احتیاطی سپرے سے گردن توڑ کا خطرہ ختم' },
      { name: 'Azoxystrobin 25% SC', brand: 'Amistar (Syngenta Pakistan) / 4B', dose: 225, unit: 'ملی لیٹر', phi: 14, note: 'جھلساؤ اور بھورے داغ دونوں میں مفید' },
    ]
  },
  'پتہ لپیٹ سنڈی (Leaf Folder)': {
    icon: '🍃', crop: 'چاول (Rice)',
    etl: '>10% لپٹے ہوئے پتے یا 5-10 سنڈیاں فی مربع میٹر',
    waterPerAcre: 100, bestTime: 'صبح 7 تا 10 بجے',
    products: [
      { name: 'Chlorantraniliprole 18.5% SC', brand: 'Coragen (FMC United) / Kanzo', dose: 175, unit: 'ملی لیٹر', phi: 7, note: 'پتے کے اندر موجود سنڈی کو مارتا ہے' },
      { name: 'Emamectin Benzoate 1.9% EC', brand: 'Proclaim (Syngenta Pakistan) / FMC', dose: 225, unit: 'ملی لیٹر', phi: 14, note: 'چاول پر لیبل شدہ پی ایچ آئی 14 دن ہے' },
    ]
  },
  'تنے کی سنڈی (Stem Borer)': {
    icon: '🐌', crop: 'چاول / مکئی (Rice / Maize)',
    etl: '>5% مردہ دل (Dead Hearts) شگوفوں کے وقت',
    waterPerAcre: 100, bestTime: 'صبح 7 تا 10 بجے',
    products: [
      { name: 'Cartap Hydrochloride 50% SP', brand: 'Padan / Thiodan Generics', dose: 450, unit: 'گرام', phi: 14, note: '450 گرام فی ایکڑ پانی میں ملا کر سپرے' },
      { name: 'Chlorantraniliprole 18.5% SC', brand: 'Coragen (FMC United)', dose: 175, unit: 'ملی لیٹر', phi: 7, note: 'شگوفے نکلتے وقت پہلی خوراک' },
    ]
  },
  'آلو/ٹماٹر پچھیتا جھلساؤ (Late Blight)': {
    icon: '🥔', crop: 'آلو / ٹماٹر (Potato / Tomato)',
    etl: 'نم آلود سرد موسم میں پتوں پر پانی بھرے کالے داغ اور سفید پھپھوندی',
    waterPerAcre: 100, bestTime: 'صبح 7 تا 10 بجے',
    products: [
      { name: 'Metalaxyl-M + Mancozeb 68% WP', brand: 'Ridomil Gold (Syngenta Pakistan)', dose: 450, unit: 'گرام', phi: 7, note: 'پہلی علامت نظر آتے ہی فوری سپرے' },
      { name: 'Cymoxanil + Famoxadone SC', brand: 'Curzate M8 (مقامی رجسٹرڈ)', dose: 275, unit: 'ملی لیٹر', phi: 4, note: 'بارش کے بعد سسٹمک علاج' },
      { name: 'Fluopicolide + Propamocarb SC', brand: 'Previcur Energy (Bayer Pakistan)', dose: 225, unit: 'ملی لیٹر', phi: 3, note: 'ٹماٹر کے لیے محفوظ ترین — صرف 3 دن PHI' },
    ]
  },
  'آلو/ٹماٹر اگیتا جھلساؤ (Early Blight)': {
    icon: '🍅', crop: 'آلو / ٹماٹر (Potato / Tomato)',
    etl: 'پرانے پتوں پر دائرہ نما بھورے نشانات (Target spots)',
    waterPerAcre: 100, bestTime: 'صبح 7 تا 10 بجے',
    products: [
      { name: 'Mancozeb 75% WP', brand: 'Dithane M-45 (Corteva) / Indofil M-45', dose: 900, unit: 'گرام', phi: 8, note: 'حفاظتی سپرے — پودے پر حفاظتی تہہ بناتا ہے' },
    ]
  },
};

// ─── 2. OFFICIAL PUNJAB WEED CONTROL & HERBICIDE MATRIX (AARI Faisalabad) ────
const WEEDS = {
  'گندم: دمبی سٹی و جنگلی جئی (Narrow-leaf)': {
    icon: '🌾', crop: 'گندم (Wheat)',
    etl: 'پہلے پانی کے بعد وتر حالت (30-35 دن) — 2 سے 6 پتے کا مرحلہ',
    waterPerAcre: 100, bestTime: 'صبح 9 بجے تا دوپہر 1 بجے (دھوپ میں)',
    products: [
      { name: 'Clodinafop-propargyl 15% WP', brand: 'Topik (Syngenta) / Skipper / Clodino', dose: 160, unit: 'گرام', phi: 30, note: 'دمبی سٹی کا حتمی خاتمہ۔ چوڑے پتے والی دوا کے ساتھ ٹینک مکس نہ کریں (7 دن کا وقفہ رکھیں)۔' },
      { name: 'Pinoxaden 5% EC', brand: 'Axial (Syngenta Pakistan) / Ali Akbar', dose: 360, unit: 'ملی لیٹر', phi: 30, note: 'جنگلی جئی اور دمبی سٹی دونوں پر موثر۔ منظور شدہ ایڈجوینٹ لازمی ملائیں۔' },
    ]
  },
  'گندم: باتھو، لیہلی، شاہترہ (Broad-leaf)': {
    icon: '🍀', crop: 'گندم (Wheat)',
    etl: 'پہلے پانی کے بعد (25-35 دن) — چوڑے پتے والی جڑی بوٹیوں کا 2-5 پتے کا مرحلہ',
    waterPerAcre: 100, bestTime: 'صبح 9 تا دوپہر 1 بجے (ہوا بند ہونے پر)',
    products: [
      { name: 'Bromoxynil + MCPA 40% EC', brand: 'Buctril-M (Bayer/Syngenta) / 4B / Kanzo', dose: 500, unit: 'ملی لیٹر', phi: 25, note: 'باتھو، لیہلی، شاہترہ، کنڈیاری کا صفایا۔ ہوا میں سپرے نہ کریں (قریبی سرسوں/سبزی کا نقصان ہو سکتا ہے)۔' },
      { name: 'Metsulfuron-methyl 20% WDG', brand: 'Ally (Corteva) / Kanzo / Ali Akbar', dose: 12, unit: 'گرام', phi: 10, note: 'صرف 10-12 گرام فی ایکڑ۔ سرفیکٹنٹ ملائیں۔ دباؤ والی فصل پر نہ کریں۔' },
    ]
  },
  'گندم: مجموعی کنٹرول (Narrow + Broad Spectrum)': {
    icon: '🌿', crop: 'گندم (Wheat)',
    etl: 'دونوں اقسام کی جڑی بوٹیاں موجود ہوں — پہلا پانی 30-35 دن بعد',
    waterPerAcre: 100, bestTime: 'صبح 10 بجے تا 2 بجے',
    products: [
      { name: 'Iodosulfuron + Mesosulfuron 6WG', brand: 'Atlantis Super (Bayer Pakistan)', dose: 100, unit: 'گرام', phi: 30, note: 'صرف عام روٹی والی گندم (Bread Wheat) کے لیے۔ ڈیوڈم (پاستا) گندم پر نہ کریں۔ باکس والا بائیو پاور لازمی ملائیں۔' },
      { name: 'Pyroxsulam + Fluroxypyr SG', brand: 'Broadway (Corteva Pakistan)', dose: 140, unit: 'گرام', phi: 30, note: '140 گرام فی ایکڑ — چوڑے اور باریک پتے والی جڑی بوٹیوں کا بیک وقت کنٹرول۔' },
      { name: 'Clodinafop + Metsulfuron Mix', brand: 'Total (Kanzo) / Ali Akbar Group', dose: 170, unit: 'گرام', phi: 30, note: '160g Clodinafop + 10g Metsulfuron پری مکس فارمولیشن۔' },
    ]
  },
  'کپاس: کاشت کے فوراً بعد (Pre-emergence)': {
    icon: '🌱', crop: 'کپاس (Cotton)',
    etl: 'کاشت کے فوراً بعد — اگاؤ سے قبل (0 تا 2 دن اندر اندر)',
    waterPerAcre: 100, bestTime: 'شام کے وقت (پہلی آبپاشی کے فوراً بعد)',
    products: [
      { name: 'Pendimethalin 33% EC', brand: 'Stomp (Bayer Pakistan) / 4B / ICI', dose: 1200, unit: 'ملی لیٹر', phi: 60, note: 'کاشت کے فوراً بعد وتر حالت پر چھڑکاؤ کریں۔ بیج کے اگاؤ سے پہلے جڑی بوٹی کے بیج کو مارتا ہے۔' },
      { name: 'S-Metolachlor 96% EC', brand: 'Dual Gold (Syngenta Pakistan)', dose: 800, unit: 'ملی لیٹر', phi: 60, note: '800 مل فی ایکڑ — گھاس نما جڑی بوٹیوں کو اگنے نہیں دیتا۔' },
    ]
  },
  'کپاس: اگاؤ کے بعد گھاس و اٹسٹ (Post-emergence)': {
    icon: '🌿', crop: 'کپاس (Cotton)',
    etl: 'کپاس 15-25 دن کی ہو اور گھاس نما جڑی بوٹیاں 2-4 پتے پر ہوں',
    waterPerAcre: 100, bestTime: 'صبح 7 تا 10 بجے',
    products: [
      { name: 'Haloxyfop-R-methyl 10.8% EC', brand: 'Gallant Super (Corteva) / Kanzo', dose: 350, unit: 'ملی لیٹر', phi: 45, note: 'صرف گھاس نما جڑی بوٹیوں پر اثر کرتا ہے۔ کپاس کے پودے کو کوئی نقصان نہیں پہنچاتا۔' },
      { name: 'Quizalofop-p-ethyl 5% EC', brand: 'Targa Super / Quick Super', dose: 400, unit: 'ملی لیٹر', phi: 45, note: 'اٹسٹ (Biscopra) اور ندی گھاس کے خلاف انتہائی موثر۔' },
    ]
  },
  'چاول: ڈھیلا، گھاس و جڑی بوٹیاں (Rice Belt)': {
    icon: '🍚', crop: 'چاول باسمتی (Rice)',
    etl: 'پنیری منتقلی کے 15 تا 20 دن بعد — کھیت میں 2 تا 5 سینٹی میٹر ہلکا کھڑا پانی ہو',
    waterPerAcre: 100, bestTime: 'صبح کے وقت',
    products: [
      { name: 'Bispyribac-sodium 20% WP', brand: 'Nominee Gold (Syngenta) / Ali Akbar', dose: 100, unit: 'ملی لیٹر', phi: 70, note: 'سپرے کے بعد 3-5 دن تک کھیت میں ہلکا پانی کھڑا رکھیں تاکہ ڈھیلا اور گھاس مکمل تلف ہوں۔' },
      { name: 'Pyrazosulfuron-ethyl 10% WP', brand: 'مقامی رجسٹرڈ فارمولیشن', dose: 220, unit: 'گرام', phi: 60, note: 'چوڑے پتے اور ڈھیلے کی جڑوں پر براہ راست اثر۔' },
    ]
  },
};

const TANK_SIZES = [15, 16, 20, 25, 100, 400];
const nas = { fontFamily: '"Noto Nastaliq Urdu", serif', direction: 'rtl' };

export default function SprayDoseCalc() {
  const [activeTab, setActiveTab] = useState('pests'); // 'pests' | 'weeds'
  const [selectedItem, setSelectedItem] = useState('');
  const [tankSize, setTankSize] = useState(20);
  const [district, setDistrict] = useState('');
  const [acres, setAcres] = useState('1');
  const [nozzleType, setNozzleType] = useState('tjet'); // 'tjet' | 'floodjet'
  const [weather, setWeather] = useState(null);
  const [wxLoading, setWxLoading] = useState(false);
  const [result, setResult] = useState(null);
  const { isOffline } = useOffline();

  const [soilData] = useState(() => { try { return getSavedSoilProfile(); } catch { return null; } });

  const activeCatalog = activeTab === 'pests' ? PESTS : WEEDS;

  const fetchWeather = useCallback(async (dist) => {
    const coords = DISTRICTS[dist];
    if (!coords) return;
    setWxLoading(true);
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&hourly=windspeed_10m,precipitation_probability&timezone=Asia%2FKarachi&forecast_days=1`;
      const res = await fetch(url);
      const data = await res.json();
      const now = new Date();
      const h = now.getHours();
      const wind = data.hourly?.windspeed_10m?.[h] ?? null;
      const rain = data.hourly?.precipitation_probability?.[h] ?? null;
      setWeather({ wind, rain, cached: false });
      localStorage.setItem('dehati_spray_weather', JSON.stringify({ wind, rain, district: dist, ts: Date.now() }));
    } catch {
      const cached = localStorage.getItem('dehati_spray_weather');
      if (cached) {
        setWeather({ ...JSON.parse(cached), cached: true });
      }
    } finally {
      setWxLoading(false);
    }
  }, []);

  const calculate = () => {
    const itemData = activeCatalog[selectedItem];
    if (!itemData) return;
    const a = parseFloat(acres) || 1;
    const tank = parseFloat(tankSize);

    const waterVol = itemData.waterPerAcre || 100;
    const products = itemData.products.map(p => {
      const dosePerTank = ((p.dose / waterVol) * tank).toFixed(1);
      const totalQuantity = (p.dose * a).toFixed(0);
      return { ...p, dosePerTank, totalQuantity };
    });

    setResult({
      type: activeTab,
      name: selectedItem,
      itemData,
      products,
      a,
      tank,
      totalTanks: Math.ceil((a * waterVol) / tank)
    });
  };

  // Weather safety gates
  const isWindyForWeed = activeTab === 'weeds' && weather && weather.wind > 10;
  const safeSpray = weather && weather.wind !== null
    ? (activeTab === 'weeds' ? (weather.wind <= 10 && weather.rain < 20) : (weather.wind < 15 && weather.rain < 20))
    : null;

  return (
    <div dir="rtl" style={{ ...nas }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0c4a6e, #075985)', borderRadius: 14, padding: '0.85rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'white' }}>
        <div style={{ fontSize: '1.6rem' }}>💧</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>اسمارٹ سپرے و کیڑے/جڑی بوٹی کیلکولیٹر</div>
          <div style={{ color: '#bae6fd', fontSize: '0.72rem', marginTop: 2 }}>
            محکمہ آفات نباتات و ایوب ریسرچ (AARI) فیصل آباد مصدقہ ڈائریکٹری 2024–2026
          </div>
        </div>
      </div>

      {/* ── Category Tabs: Pests vs Weeds ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 12 }}>
        <button
          onClick={() => { setActiveTab('pests'); setSelectedItem(''); setResult(null); }}
          style={{
            padding: '8px', borderRadius: 10,
            border: `2px solid ${activeTab === 'pests' ? '#0284c7' : '#e2e8f0'}`,
            background: activeTab === 'pests' ? '#e0f2fe' : 'white',
            color: activeTab === 'pests' ? '#0369a1' : '#64748b',
            fontWeight: 800, fontSize: '.85rem', cursor: 'pointer', ...nas
          }}
        >
          🐛 کیڑے مکوڑے و بیماریاں
        </button>
        <button
          onClick={() => { setActiveTab('weeds'); setSelectedItem(''); setResult(null); }}
          style={{
            padding: '8px', borderRadius: 10,
            border: `2px solid ${activeTab === 'weeds' ? '#15803d' : '#e2e8f0'}`,
            background: activeTab === 'weeds' ? '#dcfce7' : 'white',
            color: activeTab === 'weeds' ? '#15803d' : '#64748b',
            fontWeight: 800, fontSize: '.85rem', cursor: 'pointer', ...nas
          }}
        >
          🌿 جڑی بوٹیاں و جڑی بوٹی کش (AARI)
        </button>
      </div>

      <div className="form-group">
        {/* Selector */}
        <div>
          <label className="input-label" style={{ fontWeight: 700, marginBottom: 6, display: 'block' }}>
            {activeTab === 'pests' ? 'کیڑا یا بیماری منتخب کریں:' : 'جڑی بوٹی یا مرحلہ منتخب کریں:'}
          </label>
          <select className="input" value={selectedItem} id="spray-pest"
            onChange={e => { setSelectedItem(e.target.value); setResult(null); }}
            style={{ width: '100%', padding: '0.65rem 0.8rem', borderRadius: 8, border: '1.5px solid #d1d5db', background: 'white', fontWeight: 700, fontSize: '0.85rem', ...nas }}
          >
            <option value="">-- فہرست سے منتخب کریں --</option>
            {Object.entries(activeCatalog).map(([name, d]) => (
              <option key={name} value={name}>{d.icon} {name} ({d.crop})</option>
            ))}
          </select>
          {selectedItem && activeCatalog[selectedItem] && (
            <div style={{ fontSize: '0.72rem', color: activeTab === 'pests' ? '#0369a1' : '#15803d', marginTop: 4, fontWeight: 700 }}>
              فصل: {activeCatalog[selectedItem].crop} | پانی: {activeCatalog[selectedItem].waterPerAcre} لیٹر / ایکڑ
            </div>
          )}
        </div>

        {/* Nozzle Selection Gate (Punjab Mandatory Rule) */}
        <div style={{ marginTop: 10 }}>
          <label className="input-label" style={{ fontWeight: 700, marginBottom: 4, display: 'block' }}>
            نوزل کی قسم (محکمہ زراعت پنجاب قانون):
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <button
              onClick={() => setNozzleType('tjet')}
              style={{
                padding: '6px 8px', borderRadius: 8,
                border: `2px solid ${nozzleType === 'tjet' ? '#15803d' : '#cbd5e1'}`,
                background: nozzleType === 'tjet' ? '#f0fdf4' : 'white',
                color: nozzleType === 'tjet' ? '#15803d' : '#475569',
                fontSize: '.75rem', fontWeight: 800, cursor: 'pointer', ...nas
              }}
            >
              ✅ T-Jet / فلیٹ فین (قانونی و محفوظ)
            </button>
            <button
              onClick={() => setNozzleType('floodjet')}
              style={{
                padding: '6px 8px', borderRadius: 8,
                border: `2px solid ${nozzleType === 'floodjet' ? '#dc2626' : '#cbd5e1'}`,
                background: nozzleType === 'floodjet' ? '#fef2f2' : 'white',
                color: nozzleType === 'floodjet' ? '#dc2626' : '#475569',
                fontSize: '.75rem', fontWeight: 800, cursor: 'pointer', ...nas
              }}
            >
              ⚠️ Floodjet / کٹ نوزل
            </button>
          </div>

          {/* Hard Nozzle Prohibition Warning */}
          {nozzleType === 'floodjet' && (
            <div style={{ marginTop: 6, background: '#fee2e2', border: '1.5px solid #ef4444', borderRadius: 8, padding: '8px 10px', fontSize: '.72rem', color: '#991b1b', lineHeight: 1.5 }}>
              ⛔ <strong>محکمہ زراعت پنجاب انتباہ:</strong> کٹ نوزل (Floodjet) جڑی بوٹی مار ادویات کے لیے <strong>سختی سے ممنوع</strong> ہے! اس سے موٹے قطرے گرتے ہیں، دوا ناہموار لگتی ہے جس سے گندم جل جاتی ہے اور قریبی سرسوں/سبزی کا نقصان ہوتا ہے۔ فوراً <strong>T-Jet یا فلیٹ فین نوزل</strong> استعمال کریں۔
            </div>
          )}
        </div>

        {/* Tank Size */}
        <div style={{ marginTop: 10 }}>
          <label className="input-label" style={{ fontWeight: 700, marginBottom: 6, display: 'block' }}>سپرے ٹینکی کا سائز:</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            {TANK_SIZES.map(t => (
              <button key={t} id={`spray-tank-${t}`}
                onClick={() => setTankSize(t)}
                style={{
                  padding: '0.55rem', borderRadius: 8,
                  border: `2px solid ${tankSize === t ? '#0369a1' : '#e5e7eb'}`,
                  background: tankSize === t ? '#e0f2fe' : 'white',
                  fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer',
                  color: tankSize === t ? '#0369a1' : '#1e293b', fontFamily: 'Inter, sans-serif'
                }}
              >
                {t} لیٹر {t === 20 ? '⭐ (سولو/معیاری)' : ''}
              </button>
            ))}
          </div>
        </div>

        {/* Acreage */}
        <div style={{ marginTop: 10 }}>
          <label className="input-label" style={{ fontWeight: 700, marginBottom: 6, display: 'block' }}>رقبہ (ایکڑ میں):</label>
          <input id="spray-acres" type="number" className="input" placeholder="1" value={acres} min="0.5" step="0.5" dir="ltr"
            onChange={e => { setAcres(e.target.value); setResult(null); }}
            style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: '1rem', fontWeight: 700, fontFamily: 'Inter, sans-serif' }}
          />
        </div>

        {/* District Weather Check */}
        <div style={{ marginTop: 10 }}>
          <label className="input-label" style={{ fontWeight: 700, marginBottom: 6, display: 'block' }}>ضلع (محفوظ سپرے ونڈو چیک):</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <select className="input" value={district} id="spray-district" style={{ flex: 1, padding: '0.6rem 0.8rem', borderRadius: 8, border: '1.5px solid #d1d5db', background: 'white', ...nas }}
              onChange={e => { setDistrict(e.target.value); setWeather(null); }}
            >
              <option value="">ضلع منتخب کریں</option>
              {Object.keys(DISTRICTS).map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <button id="spray-wx-btn"
              onClick={() => district && !isOffline && fetchWeather(district)}
              disabled={!district || isOffline || wxLoading}
              style={{ padding: '0 1rem', borderRadius: 8, border: '2px solid #0369a1', background: '#eff6ff', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', minWidth: 50 }}
            >
              {wxLoading ? '⏳' : '🌤️ چیک کریں'}
            </button>
          </div>
        </div>

        {/* Weather Window Card */}
        {weather && (
          <div style={{ marginTop: 10, borderRadius: 10, padding: '0.75rem 1rem', border: '1.5px solid', borderColor: safeSpray ? '#86efac' : '#fca5a5', background: safeSpray ? '#f0fdf4' : '#fef2f2' }}>
            <div style={{ fontWeight: 800, fontSize: '0.92rem', color: safeSpray ? '#15803d' : '#dc2626' }}>
              {safeSpray ? '✅ سپرے کے لیے موسم بالکل محفوظ ہے' : '⛔ ابھی سپرے نہ کریں — دوائی اڑنے یا دھلنے کا خطرہ'}
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 6, alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.1rem' }}>💨</div>
                <div style={{ fontWeight: 800, fontFamily: 'Inter', fontSize: '0.95rem' }}>{weather.wind?.toFixed(0) ?? '?'} km/h</div>
                <div style={{ fontSize: '0.65rem', color: '#6b7280' }}>ہوا کی رفتار</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.1rem' }}>🌧️</div>
                <div style={{ fontWeight: 800, fontFamily: 'Inter', fontSize: '0.95rem' }}>{weather.rain?.toFixed(0) ?? '?'}%</div>
                <div style={{ fontSize: '0.65rem', color: '#6b7280' }}>بارش امکان</div>
              </div>
              {safeSpray !== null && (
                <div style={{ flex: 1, textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: safeSpray ? '#15803d' : '#dc2626', fontWeight: 700 }}>
                    {safeSpray
                      ? `بہترین وقت: ${activeCatalog[selectedItem]?.bestTime || 'صبح 8 تا 11 بجے'}`
                      : (isWindyForWeed
                          ? 'ہوا 10 km/h سے تیز ہے — جڑی بوٹی کش دوا اڑ کر قریبی فصلیں جلا دے گی!'
                          : 'ہوا تیز یا بارش متوقع ہے — کل صبح تک انتظار کریں')}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Calculate Button */}
        <button className="btn btn-primary btn-full" id="spray-calc-btn"
          onClick={calculate} disabled={!selectedItem}
          style={{ width: '100%', marginTop: 12, fontSize: '0.95rem', padding: '0.8rem', background: activeTab === 'pests' ? 'linear-gradient(135deg, #0c4a6e, #0369a1)' : 'linear-gradient(135deg, #14532d, #16a34a)', color: 'white', borderRadius: 10, border: 'none', fontWeight: 800, cursor: 'pointer', ...nas }}
        >
          💧 مصدقہ سپرے نسخہ حساب لگائیں
        </button>

        {/* Results */}
        {result && (
          <div className="animate-fade-in-up" style={{ marginTop: 14 }}>
            {/* Summary */}
            <div style={{ background: activeTab === 'pests' ? '#f0f9ff' : '#f0fdf4', border: `1.5px solid ${activeTab === 'pests' ? '#7dd3fc' : '#86efac'}`, borderRadius: 12, padding: '0.85rem', marginBottom: 10, textAlign: 'center' }}>
              <div style={{ fontSize: '0.92rem', color: activeTab === 'pests' ? '#0369a1' : '#14532d', fontWeight: 800 }}>
                {result.itemData.icon} {result.name} — رقبہ: {result.a} ایکڑ
              </div>
              <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: 4 }}>
                ٹینکی سائز: {result.tank} لیٹر | کل درکار ٹینکس: <strong>{result.totalTanks} ٹینک</strong> | نوزل: <strong>{nozzleType === 'tjet' ? 'T-Jet (فلیٹ فین)' : 'کٹ نوزل (وارننگ)'}</strong>
              </div>
            </div>

            {/* ETL / Application Window Box */}
            <div style={{ background: '#fef3c7', border: '1.5px solid #f59e0b', borderRadius: 10, padding: '8px 12px', marginBottom: 10, direction: 'rtl' }}>
              <div style={{ fontWeight: 800, fontSize: '.72rem', color: '#92400e' }}>
                {activeTab === 'pests' ? '⚠️ نقصان کی معاشی حد (Pest Warning ETL):' : '⏱️ سپرے کا درست ترین مرحلہ (AARI Spray Window):'}
              </div>
              <div style={{ fontSize: '.78rem', color: '#78350f', marginTop: 3, fontWeight: 700, lineHeight: 1.5 }}>
                {result.itemData.etl}
              </div>
            </div>

            {/* Soil Context Note */}
            {soilData && (() => {
              const ph = parseFloat(soilData.pH || soilData.ph || 7.5);
              const ec = parseFloat(soilData.ec || 1.5);
              const tips = [];
              if (ph > 8.0) tips.push('زمین کا pH ' + ph + ' ہے (الکالائن) — پانی میں سرکہ یا بائیو پاور ملائیں تاکہ دوائی کا اثر مکمل ہو۔');
              if (ec > 4.0) tips.push('EC ' + ec + ' dS/m — نمکین مٹی پر پودے کمزور ہوتے ہیں، پانی 100 کے بجائے 120 لیٹر فی ایکڑ رکھیں۔');
              if (!tips.length) return null;
              return (
                <div style={{ background: '#ecfdf5', border: '1.5px solid #6ee7b7', borderRadius: 10, padding: '8px 12px', marginBottom: 10 }}>
                  <div style={{ fontWeight: 800, fontSize: '.72rem', color: '#065f46', marginBottom: 2 }}>🌱 مٹی رپورٹ رہنمائی:</div>
                  {tips.map((t, idx) => <div key={idx} style={{ fontSize: '.72rem', color: '#047857', lineHeight: 1.5 }}>• {t}</div>)}
                </div>
              );
            })()}

            {/* Product Cards */}
            {result.products.map((p, i) => {
              const phiColor = p.phi <= 5 ? '#15803d' : p.phi <= 14 ? '#d97706' : '#dc2626';
              const phiBg = p.phi <= 5 ? '#f0fdf4' : p.phi <= 14 ? '#fffbeb' : '#fef2f2';
              return (
                <div key={i} style={{ background: 'white', border: '1.5px solid #e0f2fe', borderRadius: 12, padding: '0.85rem', marginBottom: 10, borderRight: `4px solid ${i === 0 ? (activeTab === 'pests' ? '#0369a1' : '#15803d') : '#64748b'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 6 }}>
                    <div>
                      <div style={{ fontWeight: 800, color: '#0c4a6e', fontSize: '0.9rem' }}>
                        {i === 0 ? '✅ اولین تجویز:' : '🔄 متبادل مالیکیول:'} {p.name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#0284c7', marginTop: 2, fontWeight: 700 }}>
                        🏷️ تجارتی برانڈز: {p.brand}
                      </div>
                    </div>
                    {/* PHI Badge */}
                    <div style={{ background: phiBg, border: `1.5px solid ${phiColor}`, borderRadius: 16, padding: '3px 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: '.68rem' }}>⏳</span>
                      <span style={{ fontSize: '.7rem', fontWeight: 800, color: phiColor, fontFamily: 'Inter, sans-serif' }}>
                        PHI: {p.phi} دن
                      </span>
                    </div>
                  </div>

                  {/* Dose Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 10 }}>
                    <div style={{ background: '#f0f9ff', borderRadius: 8, padding: '0.6rem', textAlign: 'center', border: '1px solid #bae6fd' }}>
                      <div style={{ fontSize: '0.68rem', color: '#6b7280' }}>فی {result.tank}L ٹینک خوراک</div>
                      <div style={{ fontWeight: 900, fontSize: '1.15rem', color: '#0369a1', fontFamily: 'Inter' }} dir="ltr">
                        {p.dosePerTank}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#0369a1', fontWeight: 700 }}>{p.unit}</div>
                    </div>

                    <div style={{ background: '#f8fafc', borderRadius: 8, padding: '0.6rem', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.68rem', color: '#6b7280' }}>کل درکار مقدار ({result.a} ایکڑ)</div>
                      <div style={{ fontWeight: 900, fontSize: '1.15rem', color: '#0f172a', fontFamily: 'Inter' }} dir="ltr">
                        {p.totalQuantity}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#475569', fontWeight: 700 }}>{p.unit} (فی ایکڑ: {p.dose} {p.unit})</div>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: 8, lineHeight: 1.5 }}>
                    📝 <strong>طریقہ و احتیاط:</strong> {p.note}
                  </div>
                </div>
              );
            })}

            {/* Institutional Badge */}
            <div style={{ marginTop: 8 }}>
              <InstitutionalBadge type="pest" helpline="0800-17000" />
            </div>

            {/* WhatsApp Share Prescription */}
            <button onClick={() => {
              const lines = [
                activeTab === 'pests' ? '💧 *DehatiAI مصدقہ کیڑے مار نسخہ*' : '🌿 *DehatiAI مصدقہ جڑی بوٹی کش نسخہ (AARI)*',
                `ہدف: ${result.name} (${result.itemData.crop})`,
                `رقبہ: ${result.a} ایکڑ | ٹینک سائز: ${result.tank} لیٹر | کل ٹینکس: ${result.totalTanks}`,
                `نوزل: ${nozzleType === 'tjet' ? 'T-Jet / Flat-Fan' : 'Floodjet'}`,
                `مرحلہ/معاشی حد: ${result.itemData.etl}`,
                '━━━━━━━━━━━━━━━━━',
                ...result.products.map((p, i) =>
                  `${i === 0 ? '✅ اولین تجویز' : '🔄 متبادل'}: ${p.name}` +
                  `\nبرانڈ: ${p.brand}` +
                  `\nفی ${result.tank}L ٹینک: ${p.dosePerTank} ${p.unit} | کل ایکڑ: ${p.totalQuantity} ${p.unit}` +
                  `\n⏳ PHI: ${p.phi} دن | ${p.note}`
                ),
                '━━━━━━━━━━━━━━━━━',
                `بہترین وقت: ${result.itemData.bestTime}`,
                '📚 ماخذ: محکمہ آفات نباتات پنجاب + AARI فیصل آباد',
                '📞 تصدیق کیلئے: 0800-17000 | 🌐 dehati-ai.vercel.app',
              ];
              window.open('https://wa.me/?text=' + encodeURIComponent(lines.join('\n')), '_blank');
            }}
              style={{
                width: '100%', padding: '10px', borderRadius: 10, border: 'none',
                background: '#25D366', color: '#fff', fontWeight: 800, fontSize: '0.88rem',
                cursor: 'pointer', marginTop: 10, direction: 'rtl', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
              }}
            >
              📤 ڈیلر یا زراعت افسر کو واٹس ایپ نسخہ بھیجیں
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
