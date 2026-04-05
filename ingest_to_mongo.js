/**
 * ingest_to_mongo.js
 * Seeds MongoDB with all CSV + processed-JSON data.
 * Safe to re-run: drops each collection before inserting.
 *
 * Usage:  node ingest_to_mongo.js
 *         MONGO_URL=mongodb://... node ingest_to_mongo.js
 */

const fs   = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017';
const DB_NAME   = 'hal_tejas_db';
const DATA_DIR  = path.resolve(__dirname, 'api/data');

// ── helpers ──────────────────────────────────────────────────────────────────

function readCsv(filename, delimiter = ';') {
  const p = path.join(DATA_DIR, filename);
  if (!fs.existsSync(p)) { console.warn(`SKIP (not found): ${filename}`); return []; }
  const lines = fs.readFileSync(p, 'utf8').split('\n').filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^\ufeff/, ''));
  return lines.slice(1).map(line => {
    const parts = line.split(delimiter);
    const obj   = {};
    headers.forEach((h, i) => { obj[h] = (parts[i] || '').trim(); });
    return obj;
  });
}

function readJson(relPath) {
  const p = path.resolve(__dirname, relPath);
  if (!fs.existsSync(p)) { console.warn(`SKIP (not found): ${relPath}`); return null; }
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

async function seed(db, collectionName, docs) {
  if (!docs || docs.length === 0) { console.log(`SKIP (empty): ${collectionName}`); return; }
  const col = db.collection(collectionName);
  await col.drop().catch(() => {});           // ignore "ns not found"
  await col.insertMany(docs);
  console.log(`  ✓  ${collectionName}: ${docs.length} docs`);
}

// ── transformers ─────────────────────────────────────────────────────────────

/** Mirrors parseHalIncidents() in server.js */
function transformHalIncidents(rows) {
  const SKIP = ['reclassificação', 'queda de objetos', 'princípio de incêndio', 'ferimento grave'];
  return rows.map(r => {
    const numero  = r['numero']    || r['Numero']    || '';
    const rawTipo = r['tipo']      || r['Tipo']      || '';
    const grav    = r['gravidade'] || r['Gravidade'] || '';
    const evt     = r['evento']    || r['Evento']    || '';

    const tipo = rawTipo.replace(/^SSO - /, '').trim();
    const t    = tipo.toLowerCase();

    if (SKIP.some(s => t.includes(s))) return null;

    const m     = numero.match(/^(\d{2})(\d{2})\//);
    const year  = m ? (2000 + parseInt(m[1])) : null;
    const month = m ? parseInt(m[2]) : null;

    let category = 'Other';
    if      (t.includes('csb') || t.includes('conjunto solidário'))  category = 'CSB Failure';
    else if (t.includes('bop') || t.includes('blowout'))             category = 'BOP Failure';
    else if (t.includes('kick'))                                      category = 'Kick (Primary Barrier)';
    else if (t.includes('estrutural'))                               category = 'Structural Failure';
    else if (t.includes('controle de poço'))                         category = 'Loss of Well Control';

    let severity = 'SSO';
    if      (grav === 'MINOR')    severity = 'Minor';
    else if (grav === 'MODERATE') severity = 'Moderate';
    else if (grav === 'SEVERE')   severity = 'Severe';
    else if (grav)                severity = grav;

    return { numero, tipo, rawTipo, category, severity, gravidade: grav, evento: evt, year, month };
  }).filter(Boolean);
}

/** Mirrors parseHalContracts() / parseGenericContracts() in server.js */
function transformContracts(rows) {
  return rows.map(r => {
    // Generic CSV has positional columns; use named headers when available
    const keys    = Object.keys(r);
    const numero  = r['numero'] || r[keys[3]]  || '—';
    const obj     = r['obj']    || r[keys[9]]  || 'No description provided';
    const proc    = r['proc']   || r[keys[6]]  || 'PUBLIC';
    const inicio  = r['inicio'] || r[keys[11]] || '?';
    const fim     = r['fim']    || r[keys[12]] || '?';
    const value   = r['value']  || r[keys[13]] || '—';
    return { numero, obj, proc, inicio, fim, value };
  });
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  const client = new MongoClient(MONGO_URL);
  await client.connect();
  console.log(`Connected → ${MONGO_URL}/${DB_NAME}\n`);
  const db = client.db(DB_NAME);

  // 1. HAL Incidents
  const rawIncidents = readCsv('hal_incidents.csv');
  await seed(db, 'hal_incidents', transformHalIncidents(rawIncidents));

  // 2. Brazil (Petrobras) Contracts
  const rawBrContracts = readCsv('hal-contracts-pbr.csv');
  await seed(db, 'hal_contracts', transformContracts(rawBrContracts));

  // 3. Mexico Contracts
  const rawMexContracts = readCsv('mex_contracts.csv');
  await seed(db, 'mex_contracts', transformContracts(rawMexContracts));

  // 4. Argentina Contracts
  const rawArgContracts = readCsv('arg_contracts.csv');
  await seed(db, 'arg_contracts', transformContracts(rawArgContracts));

  // 5. ANP Records (pre-processed JSON)
  const anpRecords = readJson('api/data/processed/anp_records.json');
  if (anpRecords) await seed(db, 'anp_records', anpRecords);

  // 6. ANP Stats (single-document collection)
  const anpStats = readJson('api/data/processed/anp_stats.json');
  if (anpStats) await seed(db, 'anp_stats', [anpStats]);

  // 7. HAL DB / Mexico metrics (single-document collection)
  const halDb = readJson('api/data/processed/hal_db.json');
  if (halDb) await seed(db, 'hal_db', [halDb]);

  // 8. Indexes
  console.log('\nBuilding indexes…');
  await db.collection('hal_incidents').createIndex({ year: 1 });
  await db.collection('hal_incidents').createIndex({ category: 1 });
  await db.collection('hal_incidents').createIndex({ severity: 1 });
  await db.collection('anp_records').createIndex({ year: 1 });
  await db.collection('anp_records').createIndex({ category: 1 });
  console.log('  ✓  indexes ready');

  await client.close();
  console.log('\nIngest complete.');
}

main().catch(err => { console.error('Ingest error:', err); process.exit(1); });
