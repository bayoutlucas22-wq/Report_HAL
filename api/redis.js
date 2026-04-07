/**
 * api/redis.js
 * Upstash Redis cache helper — graceful no-op when not configured.
 *
 * Usage:
 *   const { getCache, setCache, delCache } = require('./redis');
 *   const cached = await getCache('sodir:wellbores');
 *   await setCache('sodir:wellbores', data, 3600); // TTL in seconds
 *
 * Env vars (set in Railway / Vercel / .env):
 *   UPSTASH_REDIS_REST_URL   — e.g. https://xxx.upstash.io
 *   UPSTASH_REDIS_REST_TOKEN — Upstash REST token
 */

const https  = require('https');
const http   = require('http');

const REDIS_URL   = process.env.UPSTASH_REDIS_REST_URL   || '';
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || '';

const ENABLED = !!(REDIS_URL && REDIS_TOKEN);

if (ENABLED) {
  console.log('Redis: Upstash configured —', REDIS_URL.replace(/^(https?:\/\/[^/]{6})[^/]+/, '$1…'));
} else {
  console.log('Redis: not configured (UPSTASH_REDIS_REST_URL / TOKEN missing) — cache disabled');
}

function upstashRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const url      = new URL(REDIS_URL);
    const protocol = url.protocol === 'https:' ? https : http;
    const options  = {
      hostname: url.hostname,
      port:     url.port || (url.protocol === 'https:' ? 443 : 80),
      path,
      method,
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      timeout: 3000,
    };

    const req = protocol.request(options, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(null); }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Redis timeout')); });

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

/**
 * Get a cached value. Returns parsed object or null if missing/expired/unavailable.
 */
async function getCache(key) {
  if (!ENABLED) return null;
  try {
    const res = await upstashRequest('GET', `/get/${encodeURIComponent(key)}`);
    if (!res || res.result === null || res.result === undefined) return null;
    return JSON.parse(res.result);
  } catch (e) {
    console.warn(`Redis GET error (${key}):`, e.message);
    return null;
  }
}

/**
 * Set a cached value with optional TTL (seconds). Default TTL: 1 hour.
 */
async function setCache(key, value, ttlSeconds = 3600) {
  if (!ENABLED) return;
  try {
    const encoded = JSON.stringify(value);
    await upstashRequest('POST', `/set/${encodeURIComponent(key)}?EX=${ttlSeconds}`, encoded);
  } catch (e) {
    console.warn(`Redis SET error (${key}):`, e.message);
  }
}

/**
 * Delete a cached key.
 */
async function delCache(key) {
  if (!ENABLED) return;
  try {
    await upstashRequest('GET', `/del/${encodeURIComponent(key)}`);
  } catch (e) {
    console.warn(`Redis DEL error (${key}):`, e.message);
  }
}

module.exports = { getCache, setCache, delCache, ENABLED };
