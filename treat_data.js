const fs = require('fs');
const path = require('path');

function locate(rel) {
  const candidates = [
    path.resolve(__dirname, rel),
    path.resolve(__dirname, '..', rel),       
    path.resolve(process.cwd(), rel),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function parseCSVContent(content, delimiter = ';') {
  if (!content) return [];
  try {
    const lines = content.split('\n').filter(l => l.trim());
    if (lines.length < 2) return [];
    
    // Some CSVs might have quoted headers or BOM
    const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^\ufeff/, '').replace(/^"|"$/g, ''));
    
    return lines.slice(1).map(line => {
      // Split ignoring delimiter inside quotes is complex, simpler approach for now
      const values = line.split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''));
      const obj = {};
      headers.forEach((h, i) => obj[h] = values[i]);
      return obj;
    }).filter(o => Object.values(o).some(v => v));
  } catch (e) {
    console.error("CSV Parse error:", e);
    return [];
  }
}

// 1. Process ANP Incidents (from server.js)
function precomputeANP() {
  console.log("Treating ANP Incidentes...");
  const csvPath = locate("api/data/incidentes.csv") || locate("src/data/incidentes.csv") || locate("data/incidentes.csv");
  const typeCsvPath = locate("api/data/incidentes-tipo.csv") || locate("data/incidentes-tipo.csv");

  if (!csvPath || !typeCsvPath) {
    console.log("Missing ANP raw CSVs, skipping...", {csvPath, typeCsvPath});
    return null;
  }

  const typeContent = fs.readFileSync(typeCsvPath, 'latin1');
  const typeLines = typeContent.split('\n').filter(l => l.trim());
  const typeMap = {};
  
  typeLines.slice(1).forEach(line => {
    const cols = line.split(';');
    const num = cols[0]?.trim();
    if(num) {
      if(!typeMap[num]) typeMap[num] = [];
      typeMap[num].push({
        tipo: cols[1]?.trim() || "",
        gravidade: cols[2]?.trim() || "SSO",
        classe: cols[3]?.trim() || "Acidente"
      });
    }
  });

  const content = fs.readFileSync(csvPath, 'latin1');
  const lines = content.split('\n').filter(l => l.trim());

  const ANP_RECORDS = lines.slice(1).map(line => {
    const cols = line.split(';');
    const get = (i) => (cols[i] || '').trim();
    const numero = get(0);
    const date = get(3); 
    const partes = date.split('-');
    const year = partes.length === 3 ? partes[2] : null;
    const empresa = get(1).replace(/\s*\(.*\)/, '').trim();
    
    const entries = typeMap[numero] || [];
    const tipos = entries.map(e => e.tipo);
    const firstEntry = entries[0] || { tipo: "", gravidade: "SSO", classe: "Acidente" };
    const tipoStr = tipos.join(' | ').toLowerCase();

    // Map severity and evento
    const rawGrav = firstEntry.gravidade || "SSO";
    let severity = "SSO";
    if (rawGrav.includes("LEVE")) severity = "Minor";
    else if (rawGrav.includes("MODERADO")) severity = "Moderate";
    else if (rawGrav.includes("GRAVE")) severity = "Severe";

    const evento = firstEntry.classe || "Acidente";
    const tipo = firstEntry.tipo.replace(/^SSO - /, "").trim();
    
    if (tipoStr.includes('reclassificação') || tipoStr.includes('queda de objetos') || tipoStr.includes('princípio de incêndio') || tipoStr.includes('ferimento grave')) return null;

    let category = "Other";
    if (tipoStr.includes('csb') || tipoStr.includes('conjunto solidário') || tipoStr.includes('conjunto solidario')) {
      category = "CSB Failure";
    } else if (tipoStr.includes('kick') || tipoStr.includes('barreira primária') || tipoStr.includes('barreira primaria')) {
      category = "Kick (Primary Barrier)";
    } else if (tipoStr.includes('estrutural') || tipoStr.includes('revestimento') || tipoStr.includes('coluna')) {
      category = "Structural Failure";
    } else if (tipoStr.includes('controle de poço') || tipoStr.includes('controle de poco') || tipoStr.includes('perda de controle')) {
      category = "Loss of Well Control";
    } else if (tipoStr.includes('bop') || tipoStr.includes('blowout')) {
      category = "BOP Failure";
    }

    return {
      numero, empresa, instalacao: get(5), data: date, year: year && year.length === 4 ? year : null,
      lat: parseFloat(get(8)) || null, lon: parseFloat(get(9)) || null,
      situacao: get(11), feridos: parseInt(get(14)) || 0, fatalidades: parseInt(get(15)) || 0,
      descricao: get(16), codigo: get(17), tipos, category, severity, tipo, evento
    };
  }).filter(Boolean);

  const yearMapObj = {}, halYearMap = {}, categoryMap = {}, companyMap = {};
  let totalFatal = 0, totalInj = 0;
  let csbCount = 0, bopCount = 0, kickCount = 0, structCount = 0;

  const validCats = ["CSB Failure", "Kick (Primary Barrier)", "Structural Failure", "Loss of Well Control", "BOP Failure", "Other"];

  ANP_RECORDS.forEach(r => {
    const y = r.year;
    if (y && y >= '2013' && y <= '2026') {
      if (!yearMapObj[y]) {
        yearMapObj[y] = { year: y, count: 0 };
        validCats.forEach(c => yearMapObj[y][c] = 0);
      }
      yearMapObj[y].count++;
      yearMapObj[y][r.category]++;

      // Metrics for industry narrative
      if (r.category !== "Other") {
        if (!halYearMap[y]) {
          halYearMap[y] = { year: y, count: 0 };
          validCats.forEach(c => halYearMap[y][c] = 0);
        }
        halYearMap[y].count++;
        halYearMap[y][r.category]++;
      }
    }

    totalFatal += r.fatalidades;
    totalInj += r.feridos;
    companyMap[r.empresa] = (companyMap[r.empresa] || 0) + 1;
    
    if (r.category === "CSB Failure") csbCount++;
    if (r.category === "BOP Failure") bopCount++;
    if (r.category === "Kick (Primary Barrier)") kickCount++;
    if (r.category === "Structural Failure" || r.category === "Loss of Well Control") structCount++;
    
    if (r.category !== "Other") {
      categoryMap[r.category] = (categoryMap[r.category] || 0) + 1;
    }
  });

  const yearSeries = Object.values(yearMapObj).sort((a,b) => a.year.localeCompare(b.year));
  const halYearSeries = Object.values(halYearMap).sort((a,b) => a.year.localeCompare(b.year));
  const topCompanies = Object.entries(companyMap).sort((a,b) => b[1]-a[1]).slice(0,10).map(([name, count]) => ({ name, count }));

  const severityBreakdown = { "Minor": 0, "Moderate": 0, "Severe": 0, "SSO": 0 };
  ANP_RECORDS.forEach(r => {
    if (severityBreakdown[r.severity] !== undefined) severityBreakdown[r.severity]++;
    else if (r.severity) severityBreakdown[r.severity] = (severityBreakdown[r.severity] || 0) + 1;
  });

  // Calculate percentages and trends for Executive Summary support
  const ANP_STATS = { 
    total: ANP_RECORDS.length, 
    fatalidades: totalFatal, 
    feridos: totalInj, 
    csbCount, bopCount, kickCount, structCount, 
    yearSeries, 
    halYearSeries, 
    categoryBreakdown: categoryMap, 
    severityBreakdown,
    topCompanies 
  };

  // Write to processed JSON
  fs.mkdirSync(path.resolve(process.cwd(), 'api/data/processed'), {recursive: true});
  fs.writeFileSync(path.resolve(process.cwd(), 'api/data/processed/anp_records.json'), JSON.stringify(ANP_RECORDS, null, 2));
  fs.writeFileSync(path.resolve(process.cwd(), 'api/data/processed/anp_stats.json'), JSON.stringify(ANP_STATS, null, 2));
  console.log("ANP data treated and saved.");
}

// 3. Process Norway Wellbore Data (from wellbore_exploration_all.csv)
function precomputeNorway() {
  console.log("Treating Norway Wellbore Data...");
  const csvPath = locate("wellbore_exploration_all.csv");
  if (!csvPath) {
    console.log("Missing Norway raw CSV (wellbore_exploration_all.csv), skipping...");
    return null;
  }

  const content = fs.readFileSync(csvPath, 'utf8');
  const lines = content.split('\n').filter(l => l.trim());
  const headers = lines[0].replace(/^\ufeff/, '').split(',');

  const idx = (n) => headers.indexOf(n);

  // Normalize legacy operator names to current Equinor/Aker BP branding
  const OP_NORMALIZE = {
    'Den norske stats oljeselskap a.s': 'Equinor (legacy Statoil)',
    'Statoil ASA (old)': 'Equinor (legacy Statoil)',
    'Statoil Petroleum AS': 'Equinor',
    'StatoilHydro Petroleum AS': 'Equinor (legacy StatoilHydro)',
    'Norsk Hydro Produksjon AS': 'Equinor (legacy Hydro)',
    'Det norske oljeselskap ASA': 'Aker BP',
    'BP Exploration Operating Company Limited': 'BP',
    'Elf Petroleum Norge AS': 'TotalEnergies (legacy Elf)',
    'Esso Exploration and Production Norway A/S': 'ExxonMobil',
    'Phillips Petroleum Norsk AS': 'ConocoPhillips',
    'Phillips Petroleum Company Norway': 'ConocoPhillips',
    'A/S Norske Shell': 'Shell',
    'Saga Petroleum ASA': 'Equinor (legacy Saga)',
    'Amoco Norway Oil Company': 'BP (legacy Amoco)',
    'Paladin Resources Norge AS': 'Paladin Resources',
  };
  const normalizeOp = (op) => OP_NORMALIZE[op] || op;

  // Hazard profiles per field based on area + content + depth
  const FIELD_HAZARD = {
    'TROLL':         { hazard: 'Shallow gas, CO₂ injection risk, high-pressure compartments', norsok: 'NORSOK D-010 §7 barrier elements', rnnp: 'RNNP 2024 barrier defects category' },
    'OSEBERG':       { hazard: 'HPHT zones, H₂S traces, completion integrity (DHSV)', norsok: 'NORSOK D-010 §8 well integrity', rnnp: 'RNNP HC release tracking' },
    'BALDER':        { hazard: 'Shallow reservoir, oil spill exposure, high workover frequency', norsok: 'NORSOK D-010 Rev.5', rnnp: 'RNNP serious incident monitoring' },
    'JOHAN SVERDRUP':{ hazard: 'High-volume production, dense wellbore cluster, DHSV failure risk', norsok: 'NORSOK D-010 §9 completion barriers', rnnp: 'RNNP 2025 well control incidents' },
    'GULLFAKS SØR':  { hazard: 'HPHT, abnormal pore pressure, gas cap expansion risk', norsok: 'NORSOK D-010 §7', rnnp: 'RNNP HC releases ≥0.1 kg/s' },
    'GULLFAKS':      { hazard: 'HPHT, fault-bounded reservoir, cement barrier integrity', norsok: 'NORSOK D-010 Rev.5', rnnp: 'RNNP barrier defect records' },
    'ÅSGARD':        { hazard: 'Deep water, subsea template, H₂S, HPHT completions', norsok: 'NORSOK D-010 §8–9, D-001 fluid design', rnnp: 'RNNP subsea HC release category' },
    'SNØHVIT':       { hazard: 'Barents Sea, LNG export, CO₂ injection, ice loading risk', norsok: 'NORSOK D-010 §7, S-001 process safety', rnnp: 'RNNP Barents Sea incidents' },
    'OSEBERG SØR':   { hazard: 'Overpressured chalk, casing wear from depletion, WAG injection', norsok: 'NORSOK D-010 §8', rnnp: 'RNNP well control data' },
    'VISUND':        { hazard: 'Deep water, HPHT, subsea, sour gas traces', norsok: 'NORSOK D-010 §7–8', rnnp: 'RNNP HC releases tracking' },
    'FRIGG':         { hazard: 'Abandoned field, P&A integrity, legacy cement plugs', norsok: 'NORSOK D-010 §10 P&A requirements', rnnp: 'Historical RNNP P&A monitoring' },
    'VIGDIS':        { hazard: 'Deep water, subsea tie-back, long-step DHSV reach', norsok: 'NORSOK D-010 §9', rnnp: 'RNNP completion barrier category' },
    'SLEIPNER VEST': { hazard: 'CO₂ storage, gas injection, high H₂S in gas stream', norsok: 'NORSOK D-010 §7, D-001', rnnp: 'RNNP gas/condensate incidents' },
    'FRAM':          { hazard: 'Deep water, subsea template, erosion from high sand content', norsok: 'NORSOK D-010 §8–9', rnnp: 'RNNP 2024–2025 integrity scan' },
    'IVAR AASEN':    { hazard: 'Chalk reservoir, casing deformation risk, EOR injection', norsok: 'NORSOK D-010 §8', rnnp: 'RNNP barrier element failures' },
  };

  const norRecords = lines.slice(1).map(line => {
    const cols = line.split(',');
    return {
      well:        cols[idx('wlbWellboreName')],
      operator:    cols[idx('wlbDrillingOperator')],
      field:       (cols[idx('wlbField')] || '').trim(),
      entryYear:   parseInt(cols[idx('wlbEntryYear')]) || 0,
      completionYear: parseInt(cols[idx('wlbCompletionYear')]) || 0,
      status:      (cols[idx('wlbStatus')] || '').trim(),
      content:     (cols[idx('wlbContent')] || '').trim(),
      waterDepth:  parseFloat(cols[idx('wlbWaterDepth')]) || 0,
      totalDepth:  parseFloat(cols[idx('wlbTotalDepth')]) || 0,
      mainArea:    (cols[idx('wlbMainArea')] || '').trim(),
      purpose:     (cols[idx('wlbPurpose')] || '').trim(),
      subSea:      (cols[idx('wlbSubSea')] || '').trim(),
      drillingDays: parseInt(cols[idx('wlbDrillingDays')]) || 0,
    };
  }).filter(r => r.well && r.operator);

  // Summarize operators and fields
  const operators = {};
  const fieldMap = {};
  const yearStats = {};

  norRecords.forEach(r => {
    const normOp = normalizeOp(r.operator);
    operators[normOp] = (operators[normOp] || 0) + 1;

    if (r.field) {
      if (!fieldMap[r.field]) fieldMap[r.field] = { count: 0, opCounts: {}, years: [], waterDepths: [], totalDepths: [], contents: {}, areas: {}, subsea: 0, pa: 0, producing: 0 };
      const fm = fieldMap[r.field];
      fm.count++;
      const normOp2 = normalizeOp(r.operator);
      fm.opCounts[normOp2] = (fm.opCounts[normOp2] || 0) + 1;
      if (r.entryYear > 1950) fm.years.push(r.entryYear);
      if (r.waterDepth > 0) fm.waterDepths.push(r.waterDepth);
      if (r.totalDepth > 0) fm.totalDepths.push(r.totalDepth);
      if (r.content) fm.contents[r.content] = (fm.contents[r.content] || 0) + 1;
      if (r.mainArea) fm.areas[r.mainArea] = (fm.areas[r.mainArea] || 0) + 1;
      if (r.subSea === 'YES') fm.subsea++;
      if (r.status === 'P&A') fm.pa++;
      if (r.status === 'PRODUCING') fm.producing++;
    }

    if (r.entryYear >= 2013) {
      yearStats[r.entryYear] = (yearStats[r.entryYear] || 0) + 1;
    }
  });

  const topOps = Object.entries(operators).sort((a,b) => b[1] - a[1]).slice(0, 15).map(([name, count]) => ({ name, count }));

  const topFields = Object.entries(fieldMap)
    .filter(([n]) => n)
    .sort((a,b) => b[1].count - a[1].count)
    .slice(0, 15)
    .map(([name, fm]) => {
      const topOp = Object.entries(fm.opCounts).sort((a,b) => b[1]-a[1])[0]?.[0] || '';
      const topContent = Object.entries(fm.contents).sort((a,b) => b[1]-a[1])[0]?.[0] || '';
      const topArea = Object.entries(fm.areas).sort((a,b) => b[1]-a[1])[0]?.[0] || '';
      const avgWaterDepth = fm.waterDepths.length ? Math.round(fm.waterDepths.reduce((a,b)=>a+b,0)/fm.waterDepths.length) : 0;
      const avgTotalDepth = fm.totalDepths.length ? Math.round(fm.totalDepths.reduce((a,b)=>a+b,0)/fm.totalDepths.length) : 0;
      const hInfo = FIELD_HAZARD[name] || { hazard: `${topContent || 'HC'} extraction, NCS standard barrier requirements apply`, norsok: 'NORSOK D-010 Rev.5', rnnp: 'RNNP integrity monitoring' };
      return {
        name,
        count: fm.count,
        firstYear: fm.years.length ? Math.min(...fm.years) : null,
        lastYear:  fm.years.length ? Math.max(...fm.years) : null,
        topOperator: topOp,
        content: topContent,
        area: topArea,
        avgWaterDepth,
        avgTotalDepth,
        subsea: fm.subsea,
        pa: fm.pa,
        producing: fm.producing,
        hazard: hInfo.hazard,
        norsokRef: hInfo.norsok,
        rnnpRef: hInfo.rnnp,
        source: 'Sodir FactPages · factpages.sodir.no (NLOD)',
      };
    });

  const trend = Object.entries(yearStats).sort((a,b) => Number(a[0]) - Number(b[0])).map(([year, count]) => ({ year, count }));

  fs.writeFileSync(path.resolve(process.cwd(), 'api/data/processed/norway_stats.json'), JSON.stringify({
    totalWells: norRecords.length,
    topOperators: topOps,
    topFields: topFields,
    trend: trend,
    recentWells: norRecords.slice(0, 50)
  }, null, 2));

  console.log("Norway wellbore data treated.");
}

// Update the precomputeHAL to include Norway and Mexico correctly
function precomputeHAL() {
  console.log("Treating Integrated Regional Database...");
  
  // Brazil HAL-specific data (Contracts and focused incidents)
  let halIncidentsPath = locate("api/data/hal_incidents.csv");
  let halContractsPath = locate("api/data/hal-contracts-pbr.csv");
  const halIncidents = halIncidentsPath ? parseCSVContent(fs.readFileSync(halIncidentsPath, 'utf8'), ';') : [];
  const halContracts = halContractsPath ? parseCSVContent(fs.readFileSync(halContractsPath, 'utf8'), ';') : [];

  // Mexico production data (the large POR CONTRATOS file)
  let mexProdPath = locate("api/data/NACIONAL - POR CONTRATOS.csv");
  let mexicoData = [];
  if (mexProdPath) {
    const rawContent = fs.readFileSync(mexProdPath, 'utf8');
    const mexLines = rawContent.split('\n').filter(l => l.trim()).slice(4); // Skip first few header lines
    // Header is comma separated months
    mexicoData = mexLines.map(l => l.split(','));
  }

  const halDB = {
    brazil: { incidents: halIncidents, contracts: halContracts },
    mexico: { raw: mexicoData.slice(0, 50) },
    lastUpdated: new Date().toISOString()
  };

  fs.mkdirSync(path.resolve(process.cwd(), 'api/data/processed'), {recursive: true});
  fs.writeFileSync(path.resolve(process.cwd(), 'api/data/processed/hal_db.json'), JSON.stringify(halDB, null, 2));
  console.log("Integrated DB saved.");
}

precomputeANP();
precomputeNorway();
precomputeHAL();
