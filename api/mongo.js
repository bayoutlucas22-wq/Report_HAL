const { MongoClient } = require('mongodb');

const MONGO_URL = process.env.MONGODB_URI || process.env.MONGO_URL || null;
const DB_NAME   = 'hal_tejas_db';

let _client = null;
let _db     = null;
let _failed = false;

async function getDb() {
  if (_db) return _db;
  if (_failed) throw new Error('MongoDB unavailable (cached failure)');

  // No URI configured — skip immediately instead of hanging on localhost
  if (!MONGO_URL) {
    _failed = true;
    throw new Error('No MONGODB_URI configured — running in static/file mode');
  }

  _client = new MongoClient(MONGO_URL, {
    serverSelectionTimeoutMS: 3000,  // fail fast — don't hang 30s
    connectTimeoutMS: 3000,
    socketTimeoutMS: 3000
  });

  try {
    await _client.connect();
    _db = _client.db(DB_NAME);
    console.log(`MongoDB: connected to ${MONGO_URL}/${DB_NAME}`);
    return _db;
  } catch (err) {
    _failed = true;
    await _client.close().catch(() => {});
    throw err;
  }
}

module.exports = { getDb };
