const jwt = require('jsonwebtoken');

// JWT_SECRET is NEVER exported — kept module-private
const isProduction = process.env.NODE_ENV === 'production';
if (isProduction && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
  console.warn('⚠️ WARNING: JWT_SECRET is missing or < 32 chars in production. Using fallback secret.');
}

const JWT_SECRET = (process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32)
  ? process.env.JWT_SECRET
  : 'dehati-ai-production-fallback-secret-2026-punjab-agri-auth-token-v1';

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
    const decoded = jwt.verify(token, JWT_SECRET);
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
    JWT_SECRET,
    { expiresIn: '8h' }
  );
}

// SECURITY: JWT_SECRET is NOT exported — it stays module-private
module.exports = { authenticateToken, optionalAuth, requireAdmin, signToken, signAdminToken };
