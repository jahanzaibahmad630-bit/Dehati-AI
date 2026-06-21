const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dehati-ai-dev-secret-CHANGE-IN-PRODUCTION-use-32-chars';

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
    { expiresIn: '30d' }
  );
}

module.exports = { authenticateToken, optionalAuth, signToken, JWT_SECRET };
