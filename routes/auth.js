const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();
const sign = id => jwt.sign({ sub: id }, process.env.JWT_SECRET, { expiresIn: '7d' });
const cleanId = v => String(v || '').trim().replace(/^@/, '').toLowerCase();
const ID_HELP = 'Player ID must be 3-20 characters: letters, numbers or underscore.';

// GET /api/auth/check-id?id=naruto_99  -> { valid, available }   (used for the live check on the sign-up form)
router.get('/check-id', async (req, res) => {
  const id = cleanId(req.query.id);
  if (!User.ID_RE.test(id)) return res.json({ valid: false, available: false, message: ID_HELP });
  const taken = await User.exists({ playerId: id });
  res.json({ valid: true, available: !taken, message: taken ? 'That ID is already taken.' : 'ID is available.' });
});

// POST /api/auth/register  { name, playerId, password }
router.post('/register', async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const playerId = cleanId(req.body.playerId);
    const password = String(req.body.password || '');

    if (!name || name.length > 24) return res.status(400).json({ error: 'Name is required (max 24 characters).' });
    if (!User.ID_RE.test(playerId)) return res.status(400).json({ error: ID_HELP });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    if (await User.exists({ playerId })) return res.status(409).json({ error: 'That ID is already taken. Pick another one.' });

    const user = await User.create({
      name,
      playerId,
      passwordHash: await bcrypt.hash(password, 12),
      points: Math.max(0, parseInt(process.env.STARTING_POINTS, 10) || 0),
    });
    res.status(201).json({ token: sign(user.id), user: user.toPublic() });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'That ID is already taken. Pick another one.' });
    console.error(err);
    res.status(500).json({ error: 'Could not create account.' });
  }
});

// POST /api/auth/login  { playerId, password }
router.post('/login', async (req, res) => {
  try {
    const playerId = cleanId(req.body.playerId);
    const password = String(req.body.password || '');
    const user = await User.findOne({ playerId }).select('+passwordHash');
    const ok = user && (await bcrypt.compare(password, user.passwordHash));
    if (!ok) return res.status(401).json({ error: 'Wrong ID or password.' });
    res.json({ token: sign(user.id), user: user.toPublic() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not log in.' });
  }
});

// GET /api/auth/me  (needs token)
router.get('/me', auth, async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(401).json({ error: 'Account not found.' });
  res.json({ user: user.toPublic() });
});

module.exports = router;
