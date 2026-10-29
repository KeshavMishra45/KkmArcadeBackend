const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');
const catalog = require('../catalog');

const router = express.Router();

// PUT /api/profile  { name?, description? }
router.put('/profile', auth, async (req, res) => {
  try {
    const set = {};
    if (req.body.name !== undefined) {
      const name = String(req.body.name).trim();
      if (!name || name.length > 24) return res.status(400).json({ error: 'Name must be 1-24 characters.' });
      set.name = name;
    }
    if (req.body.description !== undefined) {
      const d = String(req.body.description).trim();
      if (d.length > 140) return res.status(400).json({ error: 'Description is max 140 characters.' });
      set.description = d;
    }
    const user = await User.findByIdAndUpdate(req.userId, { $set: set }, { new: true });
    res.json({ user: user.toPublic() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not save profile.' });
  }
});

// POST /api/points  { amount }   -> adds points (1..500 per request)
// NOTE: the game runs in the browser, so the server has to trust the amount. The cap limits the damage.
router.post('/points', auth, async (req, res) => {
  const amount = Number(req.body.amount);
  if (!Number.isInteger(amount) || amount < 1 || amount > 500)
    return res.status(400).json({ error: 'Invalid points amount.' });
  const user = await User.findByIdAndUpdate(req.userId, { $inc: { points: amount } }, { new: true });
  res.json({ points: user.points });
});

// POST /api/shop/buy  { kind: 'avatar'|'banner', id }  -> deducts points, adds to owned, equips
router.post('/shop/buy', auth, async (req, res) => {
  const { kind, id } = req.body;
  const item = catalog[kind];
  if (!item || !(id in item.prices)) return res.status(400).json({ error: 'Unknown item.' });
  const price = item.prices[id];

  // One atomic update: only succeeds if not already owned AND enough points.
  const user = await User.findOneAndUpdate(
    { _id: req.userId, [item.list]: { $ne: id }, points: { $gte: price } },
    { $inc: { points: -price }, $addToSet: { [item.list]: id }, $set: { [item.equipped]: id } },
    { new: true }
  );
  if (user) return res.json({ user: user.toPublic() });

  const current = await User.findById(req.userId);
  if (current && current[item.list].includes(id)) return res.status(409).json({ error: 'You already own this.' });
  res.status(402).json({ error: 'Not enough points.' });
});

// POST /api/shop/equip  { kind, id }  -> must already be owned
router.post('/shop/equip', auth, async (req, res) => {
  const { kind, id } = req.body;
  const item = catalog[kind];
  if (!item || !(id in item.prices)) return res.status(400).json({ error: 'Unknown item.' });
  const user = await User.findOneAndUpdate(
    { _id: req.userId, [item.list]: id },
    { $set: { [item.equipped]: id } },
    { new: true }
  );
  if (!user) return res.status(403).json({ error: 'You do not own this item.' });
  res.json({ user: user.toPublic() });
});

const FIELDS = 'playerId name description points avatar banner';
const pub = u => ({
  id: u._id.toString(), playerId: u.playerId, name: u.name, description: u.description,
  points: u.points, avatar: u.avatar, banner: u.banner,
});

// GET /api/leaderboard  (public) -> top 50 by points
router.get('/leaderboard', async (_req, res) => {
  const users = await User.find({}, FIELDS).sort({ points: -1 }).limit(50);
  res.json({ players: users.map(pub) });
});

// GET /api/players/search?q=...  (public) -> up to 20 players whose ID or name matches (any rank, not just the top 50)
router.get('/players/search', async (req, res) => {
  const q = String(req.query.q || '').trim().replace(/^@/, '').slice(0, 30);
  if (!q) return res.json({ players: [] });
  const rx = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const users = await User.find(
    { $or: [{ playerId: { $regex: '^' + rx, $options: 'i' } }, { name: { $regex: rx, $options: 'i' } }] },
    FIELDS
  ).sort({ points: -1 }).limit(20);
  const exact = q.toLowerCase();
  const players = users.map(pub).sort((a, b) => (b.playerId === exact) - (a.playerId === exact));   // exact ID match first
  res.json({ players });
});

// GET /api/players/:playerId  (public) -> one profile + overall rank
router.get('/players/:playerId', async (req, res) => {
  const u = await User.findOne({ playerId: String(req.params.playerId).toLowerCase() }, FIELDS);
  if (!u) return res.status(404).json({ error: 'No player with that ID.' });
  const rank = (await User.countDocuments({ points: { $gt: u.points } })) + 1;
  res.json({ player: { ...pub(u), rank } });
});

module.exports = router;
