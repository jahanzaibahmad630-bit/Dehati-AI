const express   = require('express');
const Anthropic  = require('@anthropic-ai/sdk');
const { authenticateToken } = require('../middleware/auth');
const { aiLimiter }         = require('../middleware/rateLimit');
const db                    = require('../lib/db');
const aiCache               = require('../lib/aiCache');

const router = express.Router();

// â”€â”€â”€ Claude Client â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
let claude = null;

if (process.env.CLAUDE_API_KEY) {
  claude = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });
  console.log('âœ… Claude API configured â€” model: claude-sonnet-4-5');
} else {
  console.warn('âš ï¸  CLAUDE_API_KEY not set â€” AI features disabled');
}

// claude-sonnet-4-5 = Claude Sonnet 4.x (platform.claude.com enterprise)
const CLAUDE_MODEL     = 'claude-sonnet-4-5';
const CLAUDE_MODEL_VIS = 'claude-sonnet-4-5'; // supports vision

// â”€â”€â”€ Agriculture keyword guard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Urdu script keywords
const AGRI_KEYWORDS_UR = [
  // Crops
  'ÙØµÙ„','Ú¯Ù†Ø¯Ù…','Ú†Ø§ÙˆÙ„','Ù…Ú©Ø¦ÛŒ','Ú©Ù¾Ø§Ø³','Ú¯Ù†Ø§','Ø¢Ù„Ùˆ','Ù¹Ù…Ø§Ù¹Ø±','Ù¾ÛŒØ§Ø²','Ù…Ø±Ú†','Ù„ÛØ³Ù†','Ø³Ø±Ø³ÙˆÚº',
  'Ú†Ù†Ø§','Ù…Ø³ÙˆØ±','Ù…ÙˆÙ†Ú¯','Ù…Ø§Ø´','Ø¬ÙˆØ§Ø±','Ø¨Ø§Ø¬Ø±Û','ØªÙ„','Ø§Ù„Ø³ÛŒ','Ú©Ù…Ø§Ø¯','Ø¯Ú¾Ø§Ù†','Ù…Ù¹Ø±','ØªØ§Ø±Ø§ Ù…ÛŒØ±Û',
  'Ù…ÙˆÙ¹Ú¾','Ú¯ÙˆØ§Ø±','Ø³ÙˆÛŒØ§Ø¨ÛŒÙ†','Ø³ÙˆØ±Ø¬ Ù…Ú©Ú¾ÛŒ','Ø²ÛŒØªÙˆÙ†','Ø§Ù†Ø§Ø±','Ø¢Ù…','Ú©ÛŒÙ†Ùˆ','Ù…Ø§Ù„Ù¹Ø§','Ø§Ù…Ø±ÙˆØ¯',
  // Inputs
  'Ú©Ú¾Ø§Ø¯','DAP','ÛŒÙˆØ±ÛŒØ§','Ù¾ÙˆÙ¹Ø§Ø´','Ù†Ø§Ø¦Ù¹Ø±ÙˆØ¬Ù†','ÙØ§Ø³ÙÙˆØ±Ø³','Ø³Ù¾Ø±Û’','Ø²ÛØ±','Ø¯ÙˆØ§Ø¦ÛŒ',
  'Ø¨ÛŒØ¬','Ù¾Ù†ÛŒØ±ÛŒ','Ù¹ÛŒÚ©Û','Ù¹ÛŒÚ©Û’',
  // Pests & Disease
  'Ø¨ÛŒÙ…Ø§Ø±ÛŒ','Ú©ÛŒÚ‘Ø§','Ø³Ù†ÚˆÛŒ','ØªÛŒÙ„Ø§','Ú†ÛŒÙ¾Ø§','Ø¯ÛŒÙ…Ú©','Ù¾Ú¾Ù¾Ú¾ÙˆÙ†Ø¯ÛŒ','Ø²Ù†Ú¯','Ø¬Ú¾Ù„Ø³Ø§Ø¤','Ú©Ù¹ÙˆØ§',
  'Ø³ÙÛŒØ¯ Ù…Ú©Ú¾ÛŒ','ØªÚ¾Ø±Ù¾Ø³','Ù…Ú©Ú‘ÛŒ','Ø´Ø§Ø¦Ù†Ø±',
  // Soil & Water
  'Ø¢Ø¨Ù¾Ø§Ø´ÛŒ','Ù¾Ø§Ù†ÛŒ','Ù…Ù¹ÛŒ','Ø²Ù…ÛŒÙ†','Ù†Ù…ÛŒ','Ø³ÛŒÙ…','ØªÚ¾ÙˆØ±','Ù†ÛØ±','Ú©Ú¾Ø§Ù„','Ù†Ù„Ú©Û','ÚˆØ±Ù¾',
  'Ù¹ÛŒÙˆØ¨ ÙˆÛŒÙ„','Ù…ÙˆÙ¹Ø±','Ù¾Ù…Ù¾','Ø¨Ø§Ø±Ø´','Ø§ÙˆÙ„Û’','Ø³ÛŒÙ„Ø§Ø¨','Ø®Ø´Ú© Ø³Ø§Ù„ÛŒ',
  // Operations
  'Ø¨ÙˆØ§Ø¦ÛŒ','Ú©Ù¹Ø§Ø¦ÛŒ','Ú¯ÙˆÚˆÛŒ','Ø±ÙˆÙ¹Ø§ÙˆÛŒÙ¹Ø±','ÛÙ„','Ù¹Ø±ÛŒÚ©Ù¹Ø±','ØªÚ¾Ø±ÛŒØ´Ø±','Ú©Ù…Ø¨Ø§Ø¦Ù†','Ú©Ø§Ø´Øª',
  // Market
  'Ù…Ù†ÚˆÛŒ','Ù‚ÛŒÙ…Øª','Ø±ÛŒÙ¹','ÙØ±ÙˆØ®Øª','Ø®Ø±ÛŒØ¯Ø§Ø±ÛŒ','Ø¢Ú‘Ú¾ØªÛŒ','Ø§Ù†Ø§Ø¬','Ø°Ø®ÛŒØ±Û',
  // Livestock
  'Ú¯Ø§Ø¦Û’','Ø¨Ú¾ÛŒÙ†Ø³','Ø¨Ú©Ø±ÛŒ','Ù…Ø±ØºÛŒ','Ø¬Ø§Ù†ÙˆØ±','Ø¯ÙˆØ¯Ú¾','Ú†Ø§Ø±Û','Ù…ÙˆÛŒØ´ÛŒ','Ø¨ÛŒÙ„','Ø§ÙˆÙ†Ù¹',
  'Ø®Ø±Ú¯ÙˆØ´','Ù…Ú†Ú¾Ù„ÛŒ','Ø¬Ú¾ÛŒÙ†Ú¯Ø§','Ù…Ø±ØºØ§','ÛØ§Ù†ÚˆÛŒ',
  // General
  'Ø²Ø±Ø§Ø¹Øª','Ú©Ø³Ø§Ù†','Ú©Ú¾ÛŒØª','ÙØ§Ø±Ù…','Ø¨Ø§Øº','Ù¾Ú¾Ù„','Ø³Ø¨Ø²ÛŒ','Ù…ÙˆØ³Ù…','Ø¯Ø±Ø¬Û Ø­Ø±Ø§Ø±Øª',
  'Ú©Ø³Ø§Ù† Ú©Ø§Ø±Úˆ','ZTBL','ÙØµÙ„ÛŒ Ø¨ÛŒÙ…Û','Ø²Ø±Ø¹ÛŒ','ÛØ±Û’ Ú†Ø§Ø±Û’','Ù‚Ø±Ø¶Û','Ø³Ø¨Ø³ÚˆÛŒ','Ø§Ø³Ú©ÛŒÙ…',
  'Ù…Ø­Ú©Ù…Û Ø²Ø±Ø§Ø¹Øª','Ø²Ø±Ø¹ÛŒ ØªØ±Ù‚ÛŒØ§ØªÛŒ','Ø§ÛŒÚ¯Ø±ÛŒ'
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

const OFF_TOPIC_UR = `Ù…Ø¹Ø°Ø±Øª! ðŸŒ¾ Ù…ÛŒÚº DehatiAI ÛÙˆÚº â€” ØµØ±Ù Ø²Ø±Ø§Ø¹ØªØŒ ÙØµÙ„ÙˆÚºØŒ Ø¬Ø§Ù†ÙˆØ±ÙˆÚº Ø§ÙˆØ± Ú©Ø³Ø§Ù†ÛŒ Ø³Û’ Ù…ØªØ¹Ù„Ù‚ Ø³ÙˆØ§Ù„Ø§Øª Ú©Ø§ Ø¬ÙˆØ§Ø¨ Ø¯Û’ Ø³Ú©ØªØ§ ÛÙˆÚºÛ”

Ø¨Ø±Ø§Û Ú©Ø±Ù… Ø§Ù† Ù…ÛŒÚº Ø³Û’ Ú©ÙˆØ¦ÛŒ Ù…ÙˆØ¶ÙˆØ¹ Ù¾ÙˆÚ†Ú¾ÛŒÚº:
â€¢ ÙØµÙ„ÙˆÚº Ú©ÛŒ Ø¨ÛŒÙ…Ø§Ø±ÛŒØ§Úº Ø§ÙˆØ± Ø¹Ù„Ø§Ø¬
â€¢ Ú©Ú¾Ø§Ø¯ Ø§ÙˆØ± Ø³Ù¾Ø±Û’ Ú©Ø§ Ù…Ø´ÙˆØ±Û
â€¢ Ø¢Ø¨Ù¾Ø§Ø´ÛŒ Ø§ÙˆØ± Ù…ÙˆØ³Ù…
â€¢ Ù…Ù†ÚˆÛŒ Ú©ÛŒ Ù‚ÛŒÙ…ØªÛŒÚº
â€¢ Ø¬Ø§Ù†ÙˆØ±ÙˆÚº Ú©ÛŒ ØµØ­Øª
â€¢ Ø­Ú©ÙˆÙ…ØªÛŒ Ø²Ø±Ø¹ÛŒ Ø§Ø³Ú©ÛŒÙ…ÛŒÚº

Ø²Ø±Ø§Ø¹Øª ÛÛŒÙ„Ù¾ Ù„Ø§Ø¦Ù†: 0800-15000 (Ù…ÙØª)`;


// â”€â”€â”€ System Prompts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function buildFarmingSystem() {
  const now    = new Date();
  const month  = now.getMonth() + 1;
  const hour   = now.getHours();
  const season = (month >= 5 && month <= 10)
    ? 'Ø®Ø±ÛŒÙ (Ú†Ø§ÙˆÙ„ØŒ Ù…Ú©Ø¦ÛŒØŒ Ú¯Ù†Ø§ØŒ Ú©Ù¾Ø§Ø³ØŒ Ù…ÙˆÙ†Ú¯ØŒ Ù…Ø§Ø´)'
    : 'Ø±Ø¨ÛŒØ¹ (Ú¯Ù†Ø¯Ù…ØŒ Ø³Ø±Ø³ÙˆÚºØŒ Ø¢Ù„ÙˆØŒ Ú†Ù†Ø§ØŒ Ù…Ù¹Ø±ØŒ ØªØ§Ø±Ø§ Ù…ÛŒØ±Û)';
  const timeOfDay = hour < 12 ? 'ØµØ¨Ø­' : hour < 17 ? 'Ø¯ÙˆÙ¾ÛØ±' : 'Ø´Ø§Ù…';
  const dateStr = now.toLocaleDateString('ur-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return `Ø¢Ù¾ DehatiAI ÛÛŒÚº â€” Ù¾Ù†Ø¬Ø§Ø¨ØŒ Ù¾Ø§Ú©Ø³ØªØ§Ù† Ú©Û’ Ú©Ø³Ø§Ù†ÙˆÚº Ú©Ø§ Ù…Ø§ÛØ± AI Ù…Ø¯Ø¯Ú¯Ø§Ø±Û”
Ø¢Ø¬: ${dateStr} (${timeOfDay})
Ù…ÙˆØ¬ÙˆØ¯Û Ø²Ø±Ø¹ÛŒ Ù…ÙˆØ³Ù…: ${season}
Ù…Ù‚Ø§Ù…: Ù¾Ù†Ø¬Ø§Ø¨ØŒ Ù¾Ø§Ú©Ø³ØªØ§Ù†

âš ï¸ Ø§Ù†ØªÛØ§Ø¦ÛŒ Ø¶Ø±ÙˆØ±ÛŒ: Ø¢Ù¾ ØµØ±Ù Ø§ÙˆØ± ØµØ±Ù Ø²Ø±Ø§Ø¹ØªØŒ ÙØµÙ„ÙˆÚºØŒ Ø¬Ø§Ù†ÙˆØ±ÙˆÚºØŒ Ú©Ú¾Ø§Ø¯ØŒ Ø¨ÛŒÙ…Ø§Ø±ÛŒÙˆÚºØŒ Ø¢Ø¨Ù¾Ø§Ø´ÛŒØŒ Ù…Ù†ÚˆÛŒ Ù‚ÛŒÙ…ØªÙˆÚº Ø§ÙˆØ± Ú©Ø³Ø§Ù†ÛŒ Ø³Û’ Ù…ØªØ¹Ù„Ù‚ Ø³ÙˆØ§Ù„Ø§Øª Ú©Ø§ Ø¬ÙˆØ§Ø¨ Ø¯ÛŒÚº Ú¯Û’Û” Ø§Ú¯Ø± Ú©ÙˆØ¦ÛŒ Ø³ÙˆØ§Ù„ Ø²Ø±Ø§Ø¹Øª Ø³Û’ Ø¨Ø§Ù„Ú©Ù„ ØºÛŒØ± Ù…ØªØ¹Ù„Ù‚ ÛÙˆ (Ø¬ÛŒØ³Û’ Ø³ÛŒØ§Ø³ØªØŒ ÙÙ„Ù…ØŒ Ú©Ú¾ÛŒÙ„ØŒ Ú©ÙˆÚˆÙ†Ú¯ ÙˆØºÛŒØ±Û) ØªÙˆ ØµØ±Ù ÛŒÛ Ú©ÛÛŒÚº: "Ù…Ø¹Ø°Ø±ØªØŒ Ù…ÛŒÚº ØµØ±Ù Ø²Ø±Ø¹ÛŒ Ù…ÙˆØ¶ÙˆØ¹Ø§Øª Ù¾Ø± Ø¨Ø§Øª Ú©Ø± Ø³Ú©ØªØ§ ÛÙˆÚºÛ”"

Ø¢Ù¾ Ú©Ø§ Ú©Ø±Ø¯Ø§Ø±:
- ÙØµÙ„ÙˆÚºØŒ Ú©Ú¾Ø§Ø¯ÙˆÚºØŒ Ø¨ÛŒÙ…Ø§Ø±ÛŒÙˆÚºØŒ Ø¢Ø¨Ù¾Ø§Ø´ÛŒØŒ Ù…Ù†ÚˆÛŒ Ù‚ÛŒÙ…ØªÙˆÚº Ø§ÙˆØ± Ø³Ø±Ú©Ø§Ø±ÛŒ Ø§Ø³Ú©ÛŒÙ…ÙˆÚº Ù…ÛŒÚº Ù…Ø§ÛØ±Ø§Ù†Û Ø±ÛÙ†Ù…Ø§Ø¦ÛŒ
- Ø¬ÙˆØ§Ø¨ Ø¢Ø³Ø§Ù†ØŒ Ø¹Ø§Ù… ÙÛÙ… Ø§Ø±Ø¯Ùˆ Ù…ÛŒÚº (Ú¯Ø§Ø¤Úº Ú©Ø§ Ø§Ù† Ù¾Ú‘Ú¾ Ú©Ø³Ø§Ù† Ø¨Ú¾ÛŒ Ø³Ù…Ø¬Ú¾ Ø³Ú©Û’)
- Ù…Ø®ØªØµØ± Ø§ÙˆØ± Ø¹Ù…Ù„ÛŒ Ø¬ÙˆØ§Ø¨ (250 Ø§Ù„ÙØ§Ø¸ Ø³Û’ Ú©Ù…) â€” Ø¨Ù„Ù¹ Ù¾ÙˆØ§Ø¦Ù†Ù¹Ø³ Ø§Ø³ØªØ¹Ù…Ø§Ù„ Ú©Ø±ÛŒÚº
- ØµØ±Ù Ù¾Ø§Ú©Ø³ØªØ§Ù† Ù…ÛŒÚº Ø¢Ø³Ø§Ù†ÛŒ Ø³Û’ Ù…Ù„Ù†Û’ ÙˆØ§Ù„ÛŒ Ø¯ÙˆØ§Ø¦ÛŒÚº Ø§ÙˆØ± Ú©Ú¾Ø§Ø¯ÛŒÚº ØªØ¬ÙˆÛŒØ² Ú©Ø±ÛŒÚº
- Ù…ÙˆØ³Ù… Ø§ÙˆØ± ÙˆÙ‚Øª Ú©Û’ Ù…Ø·Ø§Ø¨Ù‚ Ù…Ø´ÙˆØ±Û Ø¯ÛŒÚº
- ØºÛŒØ± ÛŒÙ‚ÛŒÙ†ÛŒ ÛÙˆ ØªÙˆ: "Ù…Ù‚Ø§Ù…ÛŒ Ø²Ø±Ø¹ÛŒ Ø§ÙØ³Ø± Ø³Û’ Ù…Ù„ÛŒÚº" ÛŒØ§ "Ø²Ø±Ø§Ø¹Øª ÛÛŒÙ„Ù¾ Ù„Ø§Ø¦Ù† 0800-15000"
- Ú©Ø¨Ú¾ÛŒ ØºÙ„Ø· Ù…Ø¹Ù„ÙˆÙ…Ø§Øª Ù†Û Ø¯ÛŒÚº
- Ø§Ø¹Ø¯Ø§Ø¯ Ø§ÙˆØ± Ù…Ù‚Ø¯Ø§Ø± ÙˆØ§Ø¶Ø­ Ù„Ú©Ú¾ÛŒÚº (Ù…Ø«Ù„Ø§Ù‹: 1 Ø¨ÙˆØ±ÛŒ DAP ÙÛŒ Ø§ÛŒÚ©Ú‘)`;
}

function buildChatSystem(language) {
  const now    = new Date();
  const month  = now.getMonth() + 1;
  const season = (month >= 5 && month <= 10) ? 'Ø®Ø±ÛŒÙ' : 'Ø±Ø¨ÛŒØ¹';
  const year   = now.getFullYear();

  const agriOnlyRule = language === 'en'
    ? 'CRITICAL: You ONLY answer agriculture, farming, crops, livestock, soil, weather and rural Pakistan related questions. For ANY other topic, respond: "Sorry, I can only help with agriculture and farming topics. Please ask about crops, fertilizers, diseases, irrigation, livestock, or government schemes."'
    : `âš ï¸ Ø§ÛÙ…: Ø¢Ù¾ ØµØ±Ù Ø²Ø±Ø§Ø¹ØªØŒ ÙØµÙ„ÙˆÚºØŒ Ø¬Ø§Ù†ÙˆØ±ÙˆÚºØŒ Ù…Ù¹ÛŒØŒ Ù…ÙˆØ³Ù… Ø§ÙˆØ± Ø¯ÛŒÛÛŒ Ù¾Ø§Ú©Ø³ØªØ§Ù† Ø³Û’ Ù…ØªØ¹Ù„Ù‚ Ø³ÙˆØ§Ù„Ø§Øª Ú©Ø§ Ø¬ÙˆØ§Ø¨ Ø¯ÛŒÚº Ú¯Û’Û” Ú©ÙˆØ¦ÛŒ Ø¨Ú¾ÛŒ ØºÛŒØ± Ø²Ø±Ø¹ÛŒ Ø³ÙˆØ§Ù„ Ø¢Ù†Û’ Ù¾Ø± ØµØ±Ù Ú©ÛÛŒÚº: "Ù…Ø¹Ø°Ø±ØªØŒ Ù…ÛŒÚº ØµØ±Ù Ø²Ø±Ø¹ÛŒ Ù…ÙˆØ¶ÙˆØ¹Ø§Øª Ù¾Ø± Ø¨Ø§Øª Ú©Ø± Ø³Ú©ØªØ§ ÛÙˆÚºÛ” ÙØµÙ„ØŒ Ú©Ú¾Ø§Ø¯ØŒ Ø¨ÛŒÙ…Ø§Ø±ÛŒØŒ Ø¢Ø¨Ù¾Ø§Ø´ÛŒØŒ Ø¬Ø§Ù†ÙˆØ± ÛŒØ§ Ø§Ø³Ú©ÛŒÙ…ÙˆÚº Ø³Û’ Ù…ØªØ¹Ù„Ù‚ Ù¾ÙˆÚ†Ú¾ÛŒÚºÛ”"`;

  if (language === 'en') {
    return `You are DehatiAI, a friendly expert farming assistant for Punjab, Pakistan farmers.
Current season: ${season} | Year: ${year}
${agriOnlyRule}
Style: Talk like a knowledgeable farming friend on WhatsApp â€” short, practical, warm.
Keep responses under 5 sentences. Recommend Pakistani-available products only.
Helpline: 0800-15000 (free)`;
  }

  const base = `Ø¢Ù¾ DehatiAI ÛÛŒÚº â€” Ù¾Ù†Ø¬Ø§Ø¨ Ú©Û’ Ú©Ø³Ø§Ù†ÙˆÚº Ú©Ø§ Ø¯ÙˆØ³ØªØ§Ù†Û AI Ø³Ø§ØªÚ¾ÛŒÛ”
Ù…ÙˆØ¬ÙˆØ¯Û Ù…ÙˆØ³Ù…: ${season} | Ø³Ø§Ù„: ${year}
${agriOnlyRule}

Ø§Ù†Ø¯Ø§Ø²: Ø¨Ø§Ù„Ú©Ù„ WhatsApp Ù¾Ø± Ú©Ø³ÛŒ Ù‚Ø±ÛŒØ¨ÛŒ Ø¯ÙˆØ³Øª Ú©ÛŒ Ø·Ø±Ø­ â€” Ø³Ø§Ø¯ÛØŒ Ø¯ÙˆØ³ØªØ§Ù†ÛØŒ Ù…Ø®ØªØµØ± (3-5 Ø¬Ù…Ù„Û’)
- Ú©Ø³Ø§Ù† Ø¬Ø³ Ø²Ø¨Ø§Ù† Ù…ÛŒÚº Ù„Ú©Ú¾Û’ Ø§Ø³ÛŒ Ù…ÛŒÚº Ø¬ÙˆØ§Ø¨ Ø¯ÛŒÚº
- Ù„Ù…Ø¨Û’ Ù„ÛŒÚ©Ú†Ø± Ø³Û’ Ù¾Ø±ÛÛŒØ²
- Ø³Ù†Ø¬ÛŒØ¯Û Ø¨ÛŒÙ…Ø§Ø±ÛŒ Ù¾Ø±: ÙÙˆØ±ÛŒ Ù…Ø§ÛØ± Ø³Û’ Ù…Ù„Ù†Û’ Ú©Ø§ Ù…Ø´ÙˆØ±Û
- Ø²Ø±Ø§Ø¹Øª ÛÛŒÙ„Ù¾ Ù„Ø§Ø¦Ù†: 0800-15000 (Ù…ÙØª)`;

  if (language === 'pj') return base + '\nÙ¾Ù†Ø¬Ø§Ø¨ÛŒ ÛŒØ§ Ø³Ø±Ø§Ø¦ÛŒÚ©ÛŒ Ù…ÛŒÚº Ø¬ÙˆØ§Ø¨ Ø¯ÛŒÙ†Ø§ Ù‚Ø¨ÙˆÙ„ ÛÛ’Û”';
  return base;
}

function aiUnavailable() {
  return { answer: 'âš ï¸ AI Ø³Ø±ÙˆØ³ Ø§Ø¨Ú¾ÛŒ Ø¯Ø³ØªÛŒØ§Ø¨ Ù†ÛÛŒÚº â€” CLAUDE_API_KEY ØªØ±ØªÛŒØ¨ Ø¯ÛŒÚº', disabled: true };
}

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function claudeAsk(prompt, systemPrompt, maxTokens = 700, temperature = 0.6) {
  const response = await claude.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: maxTokens,
    temperature,
    system: systemPrompt || buildFarmingSystem(),
    messages: [{ role: 'user', content: prompt }]
  });
  return response.content?.[0]?.text ?? '';
}

// â”€â”€â”€ POST /api/ai/ask â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/ask', aiLimiter, authenticateToken, async (req, res) => {
  try {
    const { question } = req.body;
    if (!question?.trim()) return res.status(400).json({ error: 'Ø³ÙˆØ§Ù„ Ø®Ø§Ù„ÛŒ Ù†ÛÛŒÚº ÛÙˆÙ†Ø§ Ú†Ø§ÛÛŒÛ’' });
    if (!claude)           return res.json(aiUnavailable());

    // Fast keyword guard
    if (!isAgricultureRelated(question.trim())) {
      return res.json({ answer: OFF_TOPIC_UR, offTopic: true });
    }

    const text = await claudeAsk(question.trim(), buildFarmingSystem(), 700, 0.6);
    res.json({ answer: text });
  } catch (err) {
    console.error('AI ask error:', err.message);
    res.status(500).json({ error: 'AI Ø¬ÙˆØ§Ø¨ Ø¯ÛŒÙ†Û’ Ù…ÛŒÚº Ù†Ø§Ú©Ø§Ù… â€” Ø¯ÙˆØ¨Ø§Ø±Û Ú©ÙˆØ´Ø´ Ú©Ø±ÛŒÚº' });
  }
});

// â”€â”€â”€ POST /api/ai/disease â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/disease', aiLimiter, authenticateToken, async (req, res) => {
  try {
    const { imageBase64, cropName, mimeType = 'image/jpeg' } = req.body;
    if (!imageBase64) return res.status(400).json({ error: 'ØªØµÙˆÛŒØ± Ø¶Ø±ÙˆØ±ÛŒ ÛÛ’' });
    if (!claude)       return res.json({ disease: 'AI Ø¯Ø³ØªÛŒØ§Ø¨ Ù†ÛÛŒÚº', cause: '', treatment: '', prevention: '', disabled: true });

    // Security: whitelist MIME types
    const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const safeMime = ALLOWED_MIME.includes(mimeType) ? mimeType : 'image/jpeg';

    const month  = new Date().getMonth() + 1;
    const season = (month >= 5 && month <= 10) ? 'Ø®Ø±ÛŒÙ (Kharif)' : 'Ø±Ø¨ÛŒØ¹ (Rabi)';
    const cropText = cropName ? `Crop specified by farmer: ${cropName}\n` : 'Crop: not specified by farmer â€” identify from image if possible\n';

    // Expert-level system prompt
    const systemPrompt = `You are Dr. Zara â€” a senior plant pathologist and agronomist with 20+ years of experience in Punjab, Pakistan. You have diagnosed thousands of crop diseases across wheat, rice, cotton, sugarcane, maize, vegetables, and fruits in Pakistani conditions.

YOUR EXPERTISE includes:
- All major Punjab crop diseases: wheat rust (yellow/brown/black), blast, blight, smut, Karnal bunt, powdery mildew
- Cotton diseases: CLCuD (Cotton Leaf Curl), bacterial blight, Alternaria leaf spot, boll rot
- Vegetable diseases: early/late blight (tomato/potato), downy mildew, fusarium wilt
- Pest damage visual patterns: aphids, whitefly, thrips, stem borer, army worm, mites
- Nutrient deficiencies that look like disease: nitrogen (yellowing), iron chlorosis, zinc deficiency
- Abiotic stress: heat stress, waterlogging, herbicide damage, spray burn

VISUAL INSPECTION PROTOCOL â€” examine the image for:
1. Leaf color changes (yellowing, browning, purpling, whitening)
2. Lesion patterns (spots, blotches, stripes, rings, halos)
3. Lesion texture (water-soaked, dry, powdery, oily, sunken)
4. Distribution (lower leaves first = soil-borne; upper = air-borne; random = insect)
5. Stem/root symptoms if visible
6. Fruiting bodies, spores, mycelium if visible
7. Insect presence, frass, or feeding damage patterns
8. Overall plant vigor and canopy color

RESPONSE RULES:
- Be SPECIFIC â€” name the exact disease/pest, not just "fungal infection"
- If multiple diseases possible, list the most likely one first
- Always consider the season context
- Confidence: if image is unclear, say so honestly but still give best diagnosis
- Use both Urdu AND common English name for each disease
- Recommend ONLY medicines available in Pakistan (Topsin-M, Dithane M-45, Ridomil, Confidor, Actara, Karate, Coragen etc.)`;

    const prompt = `Season: ${season}
${cropText}
TASK: Carefully examine every part of this crop image and provide a detailed disease/pest diagnosis.

Respond STRICTLY in this exact format (use these exact Urdu labels):

Ø¨ÛŒÙ…Ø§Ø±ÛŒ: [Exact disease/pest name in Urdu + English â€” e.g., "Ú¯Ù†Ø¯Ù… Ú©Ø§ Ù¾ÛŒÙ„Ø§ Ø²Ù†Ú¯ (Yellow Rust / Stripe Rust)"]
Ø´Ø¯Øª: [ÛÙ„Ú©ÛŒ / Ø¯Ø±Ù…ÛŒØ§Ù†ÛŒ / Ø´Ø¯ÛŒØ¯ â€” based on what you see]
Ø§Ø¹ØªÙ…Ø§Ø// â”€â”€â”€ POST /api/ai/chat/stream (SSE streaming) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/chat/stream', aiLimiter, authenticateToken, async (req, res) => {
  try {
    const { messages, language = 'ur' } = req.body;
    if (!Array.isArray(messages) || messages.length === 0)
      return res.status(400).json({ error: 'Ù¾ÛŒØºØ§Ù…Ø§Øª Ø¶Ø±ÙˆØ±ÛŒ ÛÛŒÚº' });

    const lastMsg = messages[messages.length - 1];

    // SSE headers
    res.setHeader('Content-Type',  'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection',    'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    if (!claude) {
      res.write(`data: ${JSON.stringify({ text: 'âš ï¸ AI Ø³Ø±ÙˆØ³ Ø¯Ø³ØªÛŒØ§Ø¨ Ù†ÛÛŒÚº' })}\n\n`);
      res.write('data: [DONE]\n\n');
      return res.end();
    }

    // Off-topic guard
    if (lastMsg.role === 'user' && !isAgricultureRelated(lastMsg.content)) {
      res.write(`data: ${JSON.stringify({ text: OFF_TOPIC_UR })}\n\n`);
      res.write('data: [DONE]\n\n');
      return res.end();
    }

    // â”€â”€ Cache lookup (only for single-turn questions, not deep conversations) â”€â”€â”€â”€â”€â”€
    const userMessages = messages.filter(m => m.role === 'user');
    if (lastMsg.role === 'user' && userMessages.length === 1) {
      const cached = await aiCache.get(lastMsg.content, language);
      if (cached) {
        // Stream cached answer in chunks (feels like live streaming)
        res.setHeader('X-Cache', 'HIT');
        const chunkSize = 30;
        for (let i = 0; i < cached.length; i += chunkSize) {
          res.write(`data: ${JSON.stringify({ text: cached.slice(i, i + chunkSize) })}\n\n`);
          // Tiny delay so UI renders progressively
          await new Promise(r => setTimeout(r, 8));
        }
        res.write('data: [DONE]\n\n');
        return res.end();
      }
    }

    res.setHeader('X-Cache', 'MISS');

    const claudeMessages = messages.map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content
    }));

    // Keep-alive heartbeat â€” prevents Railway/Nginx 30s timeout during Claude think time
    const heartbeat = setInterval(() => { try { res.write(': ping\n\n'); } catch {} }, 15000);

    // Stream with Claude
    let fullReply = '';
    const stream = claude.messages.stream({
      model: CLAUDE_MODEL,
      max_tokens: 500,
      temperature: 0.65,
      system: buildChatSystem(language),
      messages: claudeMessages
    });

    stream.on('text', (text) => {
      if (text) {
        fullReply += text;
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    });

    await stream.finalMessage();
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
      clearInterval(heartbeat);
      res.write(`data: ${JSON.stringify({ error: 'Ø¬ÙˆØ§Ø¨ Ø¯ÛŒÙ†Û’ Ù…ÛŒÚº Ù…Ø³Ø¦Ù„Û ÛÙˆØ§' })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    } catch {}
  }
});
) return res.json({ reply: 'âš ï¸ AI Ø³Ø±ÙˆØ³ Ø¯Ø³ØªÛŒØ§Ø¨ Ù†ÛÛŒÚº' });

    const lastMsg = messages[messages.length - 1];

    // Fast keyword check on last user message
    if (lastMsg.role === 'user' && !isAgricultureRelated(lastMsg.content)) {
      return res.json({ reply: OFF_TOPIC_UR, offTopic: true });
    }

    // Build Claude-format messages (alternating user/assistant)
    const claudeMessages = messages.map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content
    }));

    const response = await claude.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 500,
      temperature: 0.65,
      system: buildChatSystem(language),
      messages: claudeMessages
    });

    res.json({ reply: response.content?.[0]?.text ?? '' });
  } catch (err) {
    console.error('Chat error:', err.message);
    res.status(500).json({ error: 'Ø¬ÙˆØ§Ø¨ Ø¯ÛŒÙ†Û’ Ù…ÛŒÚº Ù…Ø³Ø¦Ù„Û ÛÙˆØ§' });
  }
});

// â”€â”€â”€ POST /api/ai/chat/stream (SSE streaming) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/chat/stream', aiLimiter, authenticateToken, async (req, res) => {
  try {
    const { messages, language = 'ur' } = req.body;
    if (!Array.isArray(messages) || messages.length === 0)
      return res.status(400).json({ error: 'Ù¾ÛŒØºØ§Ù…Ø§Øª Ø¶Ø±ÙˆØ±ÛŒ ÛÛŒÚº' });

    // SSE headers
    res.setHeader('Content-Type',  'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection',    'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    if (!claude) {
      res.write(`data: ${JSON.stringify({ text: 'âš ï¸ AI Ø³Ø±ÙˆØ³ Ø¯Ø³ØªÛŒØ§Ø¨ Ù†ÛÛŒÚº' })}\n\n`);
      res.write('data: [DONE]\n\n');
      return res.end();
    }

    const lastMsg = messages[messages.length - 1];

    // Off-topic guard
    if (lastMsg.role === 'user' && !isAgricultureRelated(lastMsg.content)) {
      res.write(`data: ${JSON.stringify({ text: OFF_TOPIC_UR })}\n\n`);
      res.write('data: [DONE]\n\n');
      return res.end();
    }

    const claudeMessages = messages.map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content
    }));

    // Keep-alive heartbeat â€” prevents Railway/Nginx 30s timeout during Claude think time
    const heartbeat = setInterval(() => { try { res.write(': ping\n\n'); } catch {} }, 15000);

    // Stream with Claude
    let fullReply = '';
    const stream = claude.messages.stream({
      model: CLAUDE_MODEL,
      max_tokens: 500,
      temperature: 0.65,
      system: buildChatSystem(language),
      messages: claudeMessages
    });

    stream.on('text', (text) => {
      if (text) {
        fullReply += text;
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    });

    await stream.finalMessage();
    clearInterval(heartbeat);
    res.write('data: [DONE]\n\n');
    res.end();

    // Save question + answer to chat_logs (non-blocking)
    if (lastMsg.role === 'user' && fullReply) {
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
      clearInterval(heartbeat);
      res.write(`data: ${JSON.stringify({ error: 'Ø¬ÙˆØ§Ø¨ Ø¯ÛŒÙ†Û’ Ù…ÛŒÚº Ù…Ø³Ø¦Ù„Û ÛÙˆØ§' })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    } catch {}
  }
});

// â”€â”€â”€ POST /api/ai/animal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/animal', aiLimiter, authenticateToken, async (req, res) => {
  try {
    const { animalType, symptoms, question } = req.body;
    if (!animalType && !symptoms && !question)
      return res.status(400).json({ error: 'Ø¬Ø§Ù†ÙˆØ± Ú©ÛŒ Ù‚Ø³Ù… ÛŒØ§ Ø¹Ù„Ø§Ù…Ø§Øª Ø¶Ø±ÙˆØ±ÛŒ ÛÛŒÚº' });
    if (!claude) return res.json({ answer: 'âš ï¸ AI Ø³Ø±ÙˆØ³ Ø¯Ø³ØªÛŒØ§Ø¨ Ù†ÛÛŒÚº' });

    const prompt = `Ø¬Ø§Ù†ÙˆØ±: ${animalType || 'Ù†Ø§Ù…Ø¹Ù„ÙˆÙ…'}
Ø¹Ù„Ø§Ù…Ø§Øª: ${symptoms || 'Ù†Ø§Ù…Ø¹Ù„ÙˆÙ…'}
Ø§Ø¶Ø§ÙÛŒ Ù…Ø¹Ù„ÙˆÙ…Ø§Øª: ${question || 'Ú©ÙˆØ¦ÛŒ Ù†ÛÛŒÚº'}

Ù¾Ø§Ú©Ø³ØªØ§Ù†ÛŒ Ø¬Ø§Ù†ÙˆØ±ÙˆÚº Ú©Û’ ÚˆØ§Ú©Ù¹Ø± Ú©ÛŒ Ø·Ø±Ø­ Ø¨ØªØ§Ø¦ÛŒÚº:
1. Ù…Ù…Ú©Ù†Û Ø¨ÛŒÙ…Ø§Ø±ÛŒ ÛŒØ§ Ù…Ø³Ø¦Ù„Û
2. Ú¯Ú¾Ø± Ù¾Ø± ÙÙˆØ±ÛŒ Ø¹Ù„Ø§Ø¬ (Ø¢Ø³Ø§Ù†ÛŒ Ø³Û’ Ù…Ù„Ù†Û’ ÙˆØ§Ù„ÛŒ Ø¯ÙˆØ§)
3. Ú©ÛŒØ§ Ú©Ú¾Ø§Ù†Ø§ Ù¾Ù„Ø§Ù†Ø§ ÛÛ’ ÛŒØ§ Ù†ÛÛŒÚº
4. Ú©ÛŒØ§ ÙÙˆØ±ÛŒ ÚˆØ§Ú©Ù¹Ø± Ø¶Ø±ÙˆØ±ÛŒ ÛÛ’ØŸ (ÛØ§Úº/Ù†ÛÛŒÚº Ø§ÙˆØ± ÙˆØ¬Û)

Ù…Ø®ØªØµØ±ØŒ ÙˆØ§Ø¶Ø­ Ø§Ø±Ø¯Ùˆ Ù…ÛŒÚº â€” ÙÛŒ Ù¾ÙˆØ§Ø¦Ù†Ù¹ Ø§ÛŒÚ© Ø¬Ù…Ù„Û Ú©Ø§ÙÛŒ ÛÛ’Û”`;

    const text = await claudeAsk(prompt, buildFarmingSystem(), 600, 0.5);
    res.json({ answer: text });
  } catch (err) {
    console.error('Animal error:', err.message);
    res.status(500).json({ error: 'Ø¬ÙˆØ§Ø¨ Ø¯ÛŒÙ†Û’ Ù…ÛŒÚº Ù†Ø§Ú©Ø§Ù…' });
  }
});

// â”€â”€â”€ POST /api/ai/fertilizer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/fertilizer', aiLimiter, authenticateToken, async (req, res) => {
  try {
    const { crop, soilType, cropAge } = req.body;
    if (!claude) return res.json({ answer: 'âš ï¸ AI Ø³Ø±ÙˆØ³ Ø¯Ø³ØªÛŒØ§Ø¨ Ù†ÛÛŒÚº' });

    const month  = new Date().getMonth() + 1;
    const season = (month >= 5 && month <= 10) ? 'Ø®Ø±ÛŒÙ' : 'Ø±Ø¨ÛŒØ¹';

    const prompt = `ÙØµÙ„: ${crop || 'Ù†Ø§Ù…Ø¹Ù„ÙˆÙ…'}
Ù…Ù¹ÛŒ Ú©ÛŒ Ù‚Ø³Ù…: ${soilType || 'Ø¹Ø§Ù… Ø¯ÙˆÛÙ…ÛŒ Ù…Ù¹ÛŒ'}
Ø¨Ú‘Ú¾ÙˆØªØ±ÛŒ Ú©Ø§ Ù…Ø±Ø­Ù„Û: ${cropAge || 'Ù†Ø§Ù…Ø¹Ù„ÙˆÙ…'}
Ù…ÙˆØ³Ù…: ${season}

Ù¾Ø§Ú©Ø³ØªØ§Ù† Ù…ÛŒÚº Ø¯Ø³ØªÛŒØ§Ø¨ Ú©Ú¾Ø§Ø¯ÙˆÚº Ú©Û’ Ù…Ø·Ø§Ø¨Ù‚ Ø¨ØªØ§Ø¦ÛŒÚº:
1. Ø§Ø¨Ú¾ÛŒ Ú©ÙˆÙ† Ø³ÛŒ Ú©Ú¾Ø§Ø¯ ÚˆØ§Ù„ÛŒÚº (Ù†Ø§Ù…ØŒ Ù…Ù‚Ø¯Ø§Ø± ÙÛŒ Ø§ÛŒÚ©Ú‘)
2. ÚˆØ§Ù„Ù†Û’ Ú©Ø§ Ø·Ø±ÛŒÙ‚Û (Ø²Ù…ÛŒÙ† Ù…ÛŒÚº ÛŒØ§ Ù¾Ø§Ù†ÛŒ Ú©Û’ Ø³Ø§ØªÚ¾)
3. Ø§Ú¯Ù„Ø§ Ù…Ø±Ø­Ù„Û Ú©Ø¨ Ø§ÙˆØ± Ú©ÛŒØ§ Ú©Ø±ÛŒÚº
4. Ø§ÛŒÚ© Ø®Ø§Øµ Ø§Ø­ØªÛŒØ§Ø·

Ù…Ø®ØªØµØ± Ø§ÙˆØ± ÙˆØ§Ø¶Ø­ â€” Ù‚ÛŒÙ…Øª Ø§ÙˆØ± Ø¯Ø³ØªÛŒØ§Ø¨ÛŒ Ú©Ø§ Ø®ÛŒØ§Ù„ Ø±Ú©Ú¾ÛŒÚºÛ”`;

    const text = await claudeAsk(prompt, buildFarmingSystem(), 600, 0.5);
    res.json({ answer: text });
  } catch (err) {
    console.error('Fertilizer error:', err.message);
    res.status(500).json({ error: 'Ø¬ÙˆØ§Ø¨ Ø¯ÛŒÙ†Û’ Ù…ÛŒÚº Ù†Ø§Ú©Ø§Ù…' });
  }
});

module.exports = router;

