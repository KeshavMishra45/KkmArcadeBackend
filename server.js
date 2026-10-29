// KKM Games API (Express + MongoDB Atlas). Runs on Vercel as a serverless function AND locally with `npm start`.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });   // local only; on Vercel use Project Settings -> Environment Variables
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();

// CORS: the frontend lives on another domain, so list it in CLIENT_ORIGIN (comma separated). Unset = allow all (fine while testing).
const origins = process.env.CLIENT_ORIGIN ? process.env.CLIENT_ORIGIN.split(',').map(s => s.trim().replace(/\/+$/, '')) : true;
app.use(cors({ origin: origins }));
app.use(express.json({ limit: '10kb' }));

// Middleware: make sure MongoDB is connected before any /api route runs.
// connectDB() caches the connection, so warm serverless calls reuse it instead of reconnecting.
async function ensureDB(_req, res, next) {
  if (!process.env.JWT_SECRET) return res.status(500).json({ error: 'Server is missing JWT_SECRET.' });
  try { await connectDB(); next(); }
  catch (err) {
    console.error('DB connection failed:', err.message);
    res.status(503).json({ error: 'Database is not reachable. Check MONGODB_URI and Atlas Network Access (0.0.0.0/0).' });
  }
}

app.get('/', (_req, res) => res.json({ ok: true, service: 'KKM Games API' }));   // quick "is it alive?" check
app.use('/api', ensureDB);
app.use('/api/auth', require('./routes/auth'));
app.use('/api', require('./routes/game'));
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

// Vercel imports this file and calls the exported app for each request: no app.listen there.
module.exports = app;

// Only when you run `node server.js` yourself (local dev) do we start a real server.
if (require.main === module) {
  const port = process.env.PORT || 5000;
  app.listen(port, () => console.log(`KKM Games API running at http://localhost:${port}`));
}
