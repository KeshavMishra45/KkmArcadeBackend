const mongoose = require('mongoose');
const User = require('../models/User');

// One-time upgrade for accounts made when login used an email.
// 1) drop the old unique email index (new accounts have no email, so it would block them)
// 2) give every old account a unique player ID built from the part of the email before the "@"
async function migrateEmailsToIds() {
  try { await User.collection.dropIndex('email_1'); console.log('Dropped old email index.'); } catch { /* not there: fine */ }

  const old = await User.collection.find({ playerId: { $exists: false } }).toArray();
  if (!old.length) return;
  const taken = new Set((await User.collection.distinct('playerId')).filter(Boolean));
  for (const u of old) {
    let base = String(u.email || u.name || 'player').split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (base.length < 3) base = (base + 'player').slice(0, 8);
    base = base.slice(0, 16);
    let id = base, n = 1;
    while (taken.has(id)) id = base + (++n);
    taken.add(id);
    await User.collection.updateOne({ _id: u._id }, { $set: { playerId: id }, $unset: { email: '' } });
    console.log(`Migrated account "${u.name}" -> player ID "${id}" (log in with this ID and the same password)`);
  }
}

// The connection (and the one-time upgrade) is cached on `global`, so warm Vercel invocations reuse it
// instead of opening a new connection on every request.
let cached = global.__kkmMongo;
if (!cached) cached = global.__kkmMongo = { promise: null };

module.exports = function connectDB() {
  if (mongoose.connection.readyState === 1 && cached.promise) return cached.promise;
  if (!cached.promise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) return Promise.reject(new Error('MONGODB_URI is missing. Create backend/.env (see .env.example) or set it in Vercel.'));
    mongoose.set('strictQuery', true);
    cached.promise = mongoose.connect(uri, { serverSelectionTimeoutMS: 10000, maxPoolSize: 5 })
      .then(async () => {
        await migrateEmailsToIds();
        await User.createIndexes();          // unique index on playerId
        console.log('MongoDB connected:', mongoose.connection.name);
      })
      .catch(err => { cached.promise = null; throw err; });   // allow a retry on the next request
  }
  return cached.promise;
};
