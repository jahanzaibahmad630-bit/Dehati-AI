const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Generate cryptographically random in-memory secret on server start if not set in environment
const EPHEMERAL_SECRET = crypto.randomBytes(64).toString('hex');

const isProduction = process.env.NODE_ENV === 'production';
if (isProduction && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
  console.warn('⚠️ WARNING: JWT_SECRET is missing or < 32 chars in production. Using ephemeral random secret.');
}

const JWT_SECRET = (process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32)
  ? process.env.JWT_SECRET
  : EPHEMERAL_SECRET;

// Separate admin signing key to prevent privilege escalation via user token forgery
const ADMIN_JWT_SECRET = (process.env.ADMIN_JWT_SECRET && process.env.ADMIN_JWT_SECRET.length >= 32)
  ? process.env.ADMIN_JWT_SECRET
  : crypto.createHmac('sha256', JWT_SECRET).update('admin-privilege-key-salt-2026').digest('hex');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'لاگ ان ضروری ہے' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(403).json({ error: 'سیشن ختم ہو گیا — دوبارہ لاگ ان کریں', code: 'TOKEN_EXPIRED' });
    }
    return res.status(403).json({ error: 'غلط ٹوکن — دوبارہ لاگ ان کریں', code: 'INVALID_TOKEN' });
  }
}

function requireAdmin(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Admin authentication required' });
  }

  try {
    const decoded = jwt.verify(token, ADMIN_JWT_SECRET);
    if (!decoded.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired admin token' });
  }
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch {}
  }
  next();
}

function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      phone: user.phone,
      name: user.name,
      district: user.district,
      landSize: user.land_size || user.landSize,
      isGuest: user.is_guest || false
    },
    JWT_SECRET,
    { expiresIn: '30d' }  // 30 days — persistent login
  );
}

function signAdminToken(email) {
  return jwt.sign(
    { email, isAdmin: true, role: 'admin' },
    ADMIN_JWT_SECRET,
    { expiresIn: '8h' }
  );
}

// SECURITY: JWT_SECRET is NOT exported — it stays module-private
module.exports = { authenticateToken, optionalAuth, requireAdmin, signToken, signAdminToken };
