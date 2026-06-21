const express = require('express');
const bcrypt = require('bcrypt');
const { supabase } = require('../lib/supabase');
const { signToken } = require('../middleware/auth');

const router = express.Router();
const SALT_ROUNDS = 12;

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, phone, district, landSize, password } = req.body;

    if (!name || !phone || !password) {
      return res.status(400).json({ error: 'نام، فون نمبر اور پاسورڈ ضروری ہیں' });
    }

    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    if (cleanPhone.length < 10) {
      return res.status(400).json({ error: 'درست فون نمبر داخل کریں' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'پاسورڈ کم از کم 6 حروف کا ہونا چاہیے' });
    }

    // Dev mode (no Supabase)
    if (!supabase) {
      const mockUser = {
        id: 'dev-' + Date.now(),
        phone: cleanPhone,
        name,
        district: district || '',
        land_size: landSize || 0,
        is_guest: false
      };
      const token = signToken(mockUser);
      return res.json({
        token,
        user: { name, phone: cleanPhone, district, landSize }
      });
    }

    // Check for existing user
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('phone', cleanPhone)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ error: 'یہ فون نمبر پہلے سے رجسٹرڈ ہے — لاگ ان کریں' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        name,
        phone: cleanPhone,
        district: district || null,
        land_size: landSize ? parseFloat(landSize) : null,
        password_hash: passwordHash
      })
      .select()
      .single();

    if (error) {
      console.error('DB insert error:', error);
      throw error;
    }

    const token = signToken(newUser);
    res.status(201).json({
      token,
      user: { name: newUser.name, phone: newUser.phone, district: newUser.district, landSize: newUser.land_size }
    });

  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ error: 'رجسٹریشن ناکام ہوئی — دوبارہ کوشش کریں' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ error: 'فون نمبر اور پاسورڈ ضروری ہیں' });
    }

    const cleanPhone = phone.replace(/[^0-9+]/g, '');

    // Dev mode
    if (!supabase) {
      const mockUser = {
        id: 'dev-' + cleanPhone,
        phone: cleanPhone,
        name: 'ٹیسٹ کسان',
        district: 'لاہور',
        land_size: 5,
        is_guest: false
      };
      return res.json({
        token: signToken(mockUser),
        user: { name: mockUser.name, phone: cleanPhone, district: mockUser.district, landSize: mockUser.land_size }
      });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('phone', cleanPhone)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'فون نمبر یا پاسورڈ غلط ہے' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'فون نمبر یا پاسورڈ غلط ہے' });
    }

    const token = signToken(user);
    res.json({
      token,
      user: { name: user.name, phone: user.phone, district: user.district, landSize: user.land_size }
    });

  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'لاگ ان ناکام ہوا — دوبارہ کوشش کریں' });
  }
});

// POST /api/auth/guest
router.post('/guest', (req, res) => {
  const guestUser = {
    id: 'guest-' + Date.now(),
    phone: 'guest',
    name: 'مہمان کسان',
    district: null,
    land_size: null,
    is_guest: true
  };
  const token = signToken(guestUser);
  res.json({
    token,
    user: { name: 'مہمان کسان', phone: 'guest', isGuest: true }
  });
});

module.exports = router;
