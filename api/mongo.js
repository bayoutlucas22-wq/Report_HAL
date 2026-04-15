const { MongoClient } = require('mongodb');

const MONGO_URL = process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb://localhost:27017';
const DB_NAME   = 'hal_tejas_db'; // Matches your ingestion scripts

let _client = null;
let _db     = null;

async function getDb() {
  if (_db) return _db;
  _client = new MongoClient(MONGO_URL);
  await _client.connect();
  _db = _client.db(DB_NAME);
  console.log(`MongoDB: connected to ${MONGO_URL}/${DB_NAME}`);
  return _db;
}

module.exports = { getDb };
