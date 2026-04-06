const { getDb } = require('./mongo');

let MEMORY_CACHE = null;

/**
 * Returns the consolidated HAL DB (mexico metrics, brazil summary, etc.)
 * Reads from the `hal_db` MongoDB collection (seeded by ingest_to_mongo.js).
 */
async function getDatabase() {
  if (MEMORY_CACHE) return MEMORY_CACHE;

  const db  = await getDb();
  const doc = await db.collection('hal_db').findOne({}, { projection: { _id: 0 } });

  if (!doc) {
    console.warn('WARNING: hal_db collection is empty. Run `node ingest_to_mongo.js` first.');
    return {
      brazil:  { incidents: [], contracts: [] },
      mexico:  { details: [], summary: {}    },
      lastUpdated: new Date().toISOString(),
    };
  }

  MEMORY_CACHE = doc;
  return MEMORY_CACHE;
}

module.exports = { getDatabase };
