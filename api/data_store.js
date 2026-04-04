require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Redis } = require("@upstash/redis");
// const { list, get } = require("@vercel/blob"); 

// Initialize Upstash Redis safely
const isFakeRedis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_URL.includes('your-upstash-redis-url');
const redis = (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN && !isFakeRedis)
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

let MEMORY_CACHE = null;

function locate(rel) {
  const candidates = [
    path.resolve(__dirname, rel),       
    path.resolve(process.cwd(), rel),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

// Fetch pre-treated JSON from Vercel Blob (Placeholder)
async function fetchBlobJSON(filename) {
  /*
  const { blobs } = await list();
  const file = blobs.find(b => b.pathname === filename);
  if (!file) return null;
  const res = await fetch(file.url);
  return await res.json();
  */
  return null;
}

function loadLocalJSON(rel) {
  const p = locate(rel);
  if (!p) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    console.error("Local JSON parsing failed for", rel, e);
    return null;
  }
}

async function buildMainDatabase() {
  console.log("ENGINE: Fetching lightweight, pre-treated JSON metrics...");

  // Priority: 1. Vercel Blob -> 2. Local Processed JSON
  let halDB = await fetchBlobJSON("processed/hal_db.json");
  if (!halDB) {
    halDB = loadLocalJSON("api/data/processed/hal_db.json");
  }

  if (!halDB) {
    // Graceful fallback for local development if the script wasn't run yet
    console.warn("WARNING: Pre-treated JSON missing. Please run `node treat_data.js`.");
    return { brazil: { incidents: [], contracts: [] }, mexico: { details: [], summary: {} }, lastUpdated: new Date().toISOString() };
  }

  return halDB;
}

async function getDatabase() {
  if (MEMORY_CACHE) return MEMORY_CACHE;

  if (redis) {
    try {
      const cached = await redis.get("hal_db_cache");
      if (cached) {
        console.log("CACHE HIT: Retrieved HAL DB from Upstash Redis.");
        MEMORY_CACHE = typeof cached === 'string' ? JSON.parse(cached) : cached;
        return MEMORY_CACHE;
      }
    } catch (e) {
      console.warn("Redis fetch failed, falling back to blob/local", e);
    }
  }

  const db = await buildMainDatabase();
  MEMORY_CACHE = db;

  if (redis && db.brazil.incidents.length > 0) {
    try {
      await redis.set("hal_db_cache", JSON.stringify(db), { ex: 3600 });
      console.log("CACHE SET: Backed up HAL DB to Upstash Redis.");
    } catch (e) {
      console.warn("Redis save failed", e);
    }
  }

  return db;
}

module.exports = { getDatabase };
