const express = require('express');
const bcrypt   = require('bcryptjs');
const { signToken } = require('../middleware/auth');
const db = require('../lib/db');

const router      = express.Router();
const SALT_ROUNDS = 10;

function makeUserObj(data, passwordHash) {
  return {
    id:            'u-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    name:          data.name.trim(),
    phone:         data.phone,
    district:      data.district || null,
    land_size:     data.landSize ? parseFloat(data.landSize) : null,
    password_hash: passwordHash,
    is_guest:      false,
    created_at:    new Date().toISOString()
  };
}

// ─── POST /api/auth/register ──────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, phone, district, landSize, password } = req.body;

    if (!name?.trim() || !phone || !password) {
      return res.status(400).json({ error: 'نام، فون نمبر اور پاسورڈ ضروری ہیں' });
    }

    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    if (cleanPhone.length < 10) {
      return res.status(400).json({ error: 'درست فون نمبر داخل کریں (کم از کم 10 ہندسے)' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'پاسورڈ کم از کم 6 حروف کا ہونا چاہیے' });
    }

    // Check duplicate
    const existing = await db.findUserByPhone(cleanPhone);
    if (existing) {
      return res.status(409).json({ error: 'یہ فون نمبر پہلے سے رجسٹرڈ ہے — لاگ ان کریں' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const newUser = makeUserObj({ name, phone: cleanPhone, district, landSize }, passwordHash);

    const saved = await db.createUser(newUser);
    if (!saved) {
      return res.status(409).json({ error: 'یہ فون نمبر پہلے سے رجسٹرڈ ہے — لاگ ان کریں' });
    }

    const token = signToken(saved);
    return res.status(201).json({
      token,
      user: { name: saved.name, phone: saved.phone, district: saved.district, landSize: saved.land_size }
    });

  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ error: 'رجسٹریشن ناکام ہوئی — براہ کرم دوبارہ کوشش کریں' });
  }
});

// ─── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ error: 'فون نمبر اور پاسورڈ ضروری ہیں' });
    }

    const cleanPhone = phone.replace(/[^0-9+]/g, '');

    // Timing-safe: always run bcrypt (prevents user enumeration)
    const user = await db.findUserByPhone(cleanPhone);
    const dummyHash = '$2b$10$invalidhashtopreventtimingattacksonusernotfound00000000';
    const hashToCheck = user ? user.password_hash : dummyHash;
    const isMatch = await bcrypt.compare(password, hashToCheck);

    if (!user || !isMatch) {
      return res.status(401).json({ error: 'فون نمبر یا پاسورڈ غلط ہے' });
    }

    const token = signToken(user);
    return res.json({
      token,
      user: { name: user.name, phone: user.phone, district: user.district, landSize: user.land_size }
    });

  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'لاگ ان ناکام ہوا — دوبارہ کوشش کریں' });
  }
});

// ─── POST /api/auth/guest ──────────────────────────────────────────────────────
router.post('/guest', (req, res) => {
  const guestUser = {
    id: 'guest-' + Date.now(), phone: 'guest',
    name: 'مہمان کسان', district: null, land_size: null, is_guest: true
  };
  const token = signToken(guestUser);
  res.json({ token, user: { name: 'مہمان کسان', phone: 'guest', isGuest: true } });
});

module.exports = router;
