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

function readCsv(filename, delimiter = ';', skipRows = 0) {
  const p = path.join(DATA_DIR, filename);
  if (!fs.existsSync(p)) { console.warn(`SKIP (not found): ${filename}`); return []; }
  const lines = fs.readFileSync(p, 'utf8').split('\n').filter(Boolean);
  if (lines.length < skipRows + 2) return [];
  const headers = lines[skipRows].split(delimiter).map(h => h.trim().replace(/^\ufeff/, '').replace(/"/g, ''));
  return lines.slice(skipRows + 1).map(line => {
    // handle quoted fields with commas
    const parts = delimiter === ',' ? splitCsvLine(line) : line.split(delimiter);
    const obj   = {};
    headers.forEach((h, i) => { obj[h] = (parts[i] || '').trim().replace(/^"|"$/g, ''); });
    return obj;
  }).filter(r => Object.values(r).some(v => v));
}

function splitCsvLine(line) {
  const result = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQ = !inQ; }
    else if (c === ',' && !inQ) { result.push(cur); cur = ''; }
    else { cur += c; }
  }
  result.push(cur);
  return result;
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

/** Transforms wellbore_exploration_all.csv — Sodir FactPages, NLOD licence */
function transformSodirWellbores(rows) {
  return rows.map(r => ({
    wlbName:      r['wlbWellboreName']     || '',
    wlbField:     r['wlbField']            || '',
    wlbOperator:  r['wlbDrillingOperator'] || '',
    wlbWellType:  r['wlbWellType']         || '',
    wlbStatus:    r['wlbStatus']           || '',
    wlbYear:      r['wlbEntryYear']        || '',
    wlbTotalDepth:r['wlbTotalDepth']       || '',
    wlbPurpose:   r['wlbPurpose']          || '',
    wlbContent:   r['wlbContent']          || '',
    wlbWaterDepth:r['wlbWaterDepth']       || '',
    wlbLicence:   r['wlbProductionLicence']|| '',
    wlbSubSea:    r['wlbSubSea']           || '',
    wlbMainArea:  r['wlbMainArea']         || '',
  })).filter(r => r.wlbName);
}

/** Transforms norway_incidents.csv — same schema as hal_incidents.csv */
function transformNorwayIncidents(rows) {
  return rows.map(r => {
    const numero  = r['numero']    || '';
    const rawTipo = r['tipo']      || '';
    const grav    = r['gravidade'] || '';
    const evt     = r['evento']    || '';

    const tipo = rawTipo.replace(/^SSO - /, '').trim();
    const t    = tipo.toLowerCase();

    const m     = numero.match(/^(\d{2})(\d{2})\//);
    const year  = m ? (2000 + parseInt(m[1])) : null;
    const month = m ? parseInt(m[2]) : null;

    // Extract NCS field name from evento: "(NCS-Troll A) ..."
    const fm    = evt.match(/NCS-([^)]+)/);
    const field = fm ? fm[1].trim() : null;

    let category = 'Other';
    if      (t.includes('csb') || t.includes('shear'))       category = 'CSB Failure';
    else if (t.includes('bop'))                               category = 'BOP Failure';
    else if (t.includes('kick'))                              category = 'Kick (Primary Barrier)';
    else if (t.includes('structural') || t.includes('fatigue')) category = 'Structural Failure';
    else if (t.includes('complete loss'))                     category = 'Loss of Well Control';
    else if (t.includes('hydrocarbon'))                       category = 'HC Release';

    let severity = 'SSO';
    if      (grav === 'MINOR')    severity = 'Minor';
    else if (grav === 'MODERATE') severity = 'Moderate';
    else if (grav === 'SEVERE')   severity = 'Severe';

    return { numero, tipo, rawTipo, category, severity, gravidade: grav, evento: evt, field, year, month };
  }).filter(r => r.numero);
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

/** ANP incidentes.csv — full incident registry with lat/lon */
function transformAnpIncidentes(rows) {
  return rows.map(r => {
    const lat = parseFloat((r['Latitude']  || '').replace(',', '.')) || null;
    const lon = parseFloat((r['Longitude'] || '').replace(',', '.')) || null;
    const dateStr = r['Data_estimada_do_incidente'] || r['Data_da_primeira_observacao'] || '';
    let year = null, month = null;
    const m = dateStr.match(/(\d{2})-(\d{2})-(\d{4})/);
    if (m) { year = parseInt(m[3]); month = parseInt(m[2]); }
    return {
      numero:      r['Numero'] || '',
      empresa:     r['Empresa'] || '',
      instalacao:  r['Instalacao'] || '',
      data:        dateStr,
      year, month, lat, lon,
      situacao:    r['Situacao_atual_descarga'] || '',
      fatalidades: parseInt(r['Numero_Fatalidades'] || '0') || 0,
      feridos:     parseInt(r['Numero_de_feridos_graves'] || '0') || 0,
      descricao:   (r['Breve_Descricao_Incidente'] || '').slice(0, 500),
    };
  }).filter(r => r.numero);
}

/** incidentes-tipo.csv — incident type lookup */
function transformIncidentesTipo(rows) {
  return rows.map(r => ({
    numero:    r['Numero'] || '',
    tipo:      r['Tipo_de_incidente'] || '',
    gravidade: r['DSC_GRAVIDADE_TIPO'] || '',
    quase:     r['DSC_QUASE_ACIDENTE_ACIDENTE'] || '',
  })).filter(r => r.numero);
}

/** mexico_perforacion.csv — SIH drilling jobs */
function transformMexPerforacion(rows) {
  return rows.map(r => ({
    id_pozo:        r['id_pozo'] || '',
    operador:       r['operador'] || '',
    cuenca:         r['cuenca'] || '',
    formacion:      r['formacion'] || '',
    year:           parseInt(r['year']) || null,
    etapas_fractura:parseFloat(r['etapas_fractura']) || 0,
    agua_m3:        parseFloat(r['agua_m3']) || 0,
    presion_max_psi:parseFloat(r['presion_max_psi']) || 0,
    potencia_hp:    parseFloat(r['potencia_hp']) || 0,
    longitud_lateral_m: parseFloat(r['longitud_lateral_m']) || 0,
    offshore:       r['offshore_flag'] === '1',
  })).filter(r => r.id_pozo);
}

/** tejas_exposure_proxy.csv — Tejas/HAL well exposure */
function transformTejasProxy(rows) {
  return rows.map(r => ({
    fecha:       r['FECHA'] || '',
    cuenca:      r['CUENCA'] || '',
    categoria:   r['CATEGORIA_POZO'] || '',
    ubicacion:   r['UBICACION'] || '',
    operador:    r['OPERADOR'] || '',
    pozos_perforados: parseFloat(r['POZOS_PERFORADOS']) || 0,
    pozos_terminados: parseFloat(r['POZOS_TERMINADOS']) || 0,
    missing_completions: parseFloat(r['MISSING_COMPLETIONS']) || 0,
    year:        parseInt(r['YEAR']) || null,
    subcontractors: r['Likely Subcontractors'] || '',
  })).filter(r => r.fecha);
}

/** PRODUCCION_CAMPOS.csv — Mexico field production (header at row 11) */
function transformMexCampos(rows) {
  return rows.map(r => ({
    fecha:       r['FECHA'] || '',
    campo:       r['CAMPO_OFICIAL'] || r['CAMPO_SIH'] || '',
    ubicacion:   r['UBICACION'] || '',
    liquidos_mbd:parseFloat(r['HIDROCARBUROS_LIQUIDOS_MBD']) || 0,
    petroleo_mbd:parseFloat(r['PETROLEO_MBD']) || 0,
    gas_asoc:    parseFloat(r['GAS_ASOC_MMPCD']) || 0,
    gas_nasoc:   parseFloat(r['GAS_NASOC_MMPCD']) || 0,
  })).filter(r => r.fecha && r.campo);
}

/** POZOS_PERFORADOS.csv — Mexico drilled wells (header at row 5) */
function transformMexPozos(rows) {
  return rows.map(r => {
    const keys = Object.keys(r);
    return {
      fecha:    r[keys[0]] || '',
      cuenca:   r[keys[1]] || '',
      tipo:     r[keys[2]] || '',
      ubicacion:r[keys[3]] || '',
      pozos:    parseFloat(r[keys[4]]) || 0,
    };
  }).filter(r => r.fecha && r.cuenca);
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

  // 4b. Sodir Wellbore Registry — wellbore_exploration_all.csv (NLOD, comma-delimited)
  const rawWellbores = readCsv('wellbore_exploration_all.csv', ',');
  await seed(db, 'sodir_wellbores', transformSodirWellbores(rawWellbores));

  // 4c. Norway Incidents
  const rawNorIncidents = readCsv('norway_incidents.csv');
  await seed(db, 'nor_incidents', transformNorwayIncidents(rawNorIncidents));

  // 4c. Norway Contracts
  const rawNorContracts = readCsv('norway_contracts.csv');
  await seed(db, 'nor_contracts', transformContracts(rawNorContracts));

  // 5. ANP Records (pre-processed JSON)
  const anpRecords = readJson('api/data/processed/anp_records.json');
  if (anpRecords) await seed(db, 'anp_records', anpRecords);

  // 6. ANP Stats (single-document collection)
  const anpStats = readJson('api/data/processed/anp_stats.json');
  if (anpStats) await seed(db, 'anp_stats', [anpStats]);

  // 7. HAL DB / Mexico metrics (single-document collection)
  const halDb = readJson('api/data/processed/hal_db.json');
  if (halDb) await seed(db, 'hal_db', [halDb]);

  // 8. ANP full incident registry (incidentes.csv)
  const rawAnpFull = readCsv('incidentes_utf8.csv');
  await seed(db, 'anp_incidentes', transformAnpIncidentes(rawAnpFull));

  // 9. ANP incident type lookup (incidentes-tipo.csv)
  const rawTipos = readCsv('incidentes-tipo.csv', ';');
  await seed(db, 'anp_incidentes_tipo', transformIncidentesTipo(rawTipos));

  // 10. Mexico SIH drilling jobs
  const rawMexPerf = readCsv('mexico_perforacion.csv', ',');
  await seed(db, 'mex_perforacion', transformMexPerforacion(rawMexPerf));

  // 11. Tejas exposure proxy
  const rawTejas = readCsv('tejas_exposure_proxy.csv', ',');
  await seed(db, 'tejas_proxy', transformTejasProxy(rawTejas));

  // 12. Mexico field production (header at row 11, comma-delimited)
  const rawCampos = readCsv('PRODUCCION_CAMPOS.csv', ',', 11);
  await seed(db, 'mex_campos', transformMexCampos(rawCampos));

  // 13. Mexico drilled wells (header at row 5, comma-delimited)
  const rawPozos = readCsv('POZOS_PERFORADOS (1).csv', ',', 5);
  await seed(db, 'mex_pozos', transformMexPozos(rawPozos));

  // 14. Indexes
  console.log('\nBuilding indexes…');
  await db.collection('hal_incidents').createIndex({ year: 1 });
  await db.collection('hal_incidents').createIndex({ category: 1 });
  await db.collection('hal_incidents').createIndex({ severity: 1 });
  await db.collection('anp_records').createIndex({ year: 1 });
  await db.collection('anp_records').createIndex({ category: 1 });
  await db.collection('sodir_wellbores').createIndex({ wlbField: 1 });
  await db.collection('sodir_wellbores').createIndex({ wlbOperator: 1 });
  await db.collection('sodir_wellbores').createIndex({ wlbWellType: 1 });
  await db.collection('sodir_wellbores').createIndex({ wlbStatus: 1 });
  await db.collection('nor_incidents').createIndex({ year: 1 });
  await db.collection('nor_incidents').createIndex({ category: 1 });
  await db.collection('nor_incidents').createIndex({ severity: 1 });
  await db.collection('nor_incidents').createIndex({ field: 1 });
  await db.collection('anp_incidentes').createIndex({ year: 1 });
  await db.collection('anp_incidentes').createIndex({ empresa: 1 });
  await db.collection('anp_incidentes_tipo').createIndex({ numero: 1 });
  await db.collection('anp_incidentes_tipo').createIndex({ tipo: 1 });
  await db.collection('mex_perforacion').createIndex({ year: 1 });
  await db.collection('mex_perforacion').createIndex({ cuenca: 1 });
  await db.collection('mex_perforacion').createIndex({ operador: 1 });
  await db.collection('tejas_proxy').createIndex({ year: 1 });
  await db.collection('tejas_proxy').createIndex({ cuenca: 1 });
  await db.collection('mex_campos').createIndex({ campo: 1 });
  await db.collection('mex_campos').createIndex({ fecha: 1 });
  await db.collection('mex_pozos').createIndex({ cuenca: 1 });
  console.log('  ✓  indexes ready');

  await client.close();
  console.log('\nIngest complete.');
}

main().catch(err => { console.error('Ingest error:', err); process.exit(1); });
