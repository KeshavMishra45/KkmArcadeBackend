// Run with: npm run check-db   (tests your MONGODB_URI before you start the server)
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

(async () => {
  if (!process.env.MONGODB_URI) { console.error('FAILED: MONGODB_URI is missing in backend/.env'); process.exit(1); }
  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
    console.log('OK: connected to Atlas, database name = "' + mongoose.connection.name + '"');
  } catch (e) {
    console.error('FAILED:', e.message, '\n');
    const m = e.message;
    if (/bad auth|authentication failed/i.test(m)) console.error('Hint: wrong database username/password. Check Atlas -> Database Access, and URL-encode special characters in the password.');
    else if (/querySrv|ENOTFOUND|ECONNREFUSED/i.test(m)) console.error('Hint: DNS problem. Switch your DNS to 8.8.8.8, or use the "standard connection string" (mongodb://...) from Atlas -> Connect -> Drivers.');
    else console.error('Hint: add your IP in Atlas -> Network Access, and make sure the cluster is not paused (Atlas -> Database -> Resume).');
    process.exitCode = 1;
  } finally { await mongoose.disconnect().catch(() => {}); }
})();
