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

// 2. Process HAL DB (from data_store.js)
function precomputeHAL() {
  console.log("Treating HAL Database...");
  let halIncidentsPath = locate("api/data/hal_incidents.csv") || locate("src/data/hal_incidents.csv") || locate("data/hal_incidents.csv");
  let halContractsPath = locate("api/data/hal-contracts-pbr.csv");

  const halIncidents = halIncidentsPath ? parseCSVContent(fs.readFileSync(halIncidentsPath, 'utf8'), ';') : [];
  const halContracts = halContractsPath ? parseCSVContent(fs.readFileSync(halContractsPath, 'utf8'), ';') : [];

  console.log(`Loaded ${halIncidents.length} incidents and ${halContracts.length} contracts for Brazil.`);

  const brzIncidents = halIncidents.map(r => {
    let category = "Other";
    const t = (r.Tipo_de_incidente || "").toLowerCase();
    if (t.includes("csb") || t.includes("conjunto solidário")) category = "CSB Failure";
    else if (t.includes("bop") || t.includes("blowout")) category = "BOP Failure";
    else if (t.includes("kick")) category = "Kick (Primary Barrier)";
    else if (t.includes("estrutural")) category = "Structural Failure";

    const num = r.Numero || "";
    const m = num.match(/^(\d{2})(\d{2})\//);
    return {
      numero: num,
      tipo: r.Tipo_de_incidente,
      severity: r.DSC_GRAVIDADE_TIPO || "SSO",
      category,
      year: m ? 2000 + parseInt(m[1]) : null
    };
  });

  let mexPerfPath = locate("api/data/mexico_perforacion.csv");
  let mexProdPath = locate("api/data/mexico_produccion.csv");

  const mexPerf = mexPerfPath ? parseCSVContent(fs.readFileSync(mexPerfPath, 'utf8'), ',') : [];
  const mexProd = mexProdPath ? parseCSVContent(fs.readFileSync(mexProdPath, 'utf8'), ',') : [];

  const mexicoStore = mexPerf.map(p => {
    const prod = mexProd.find(pr => pr.id_pozo === p.id_pozo) || {};
    return { ...p, ...prod };
  });

  const mexSummary = {
     operators: mexicoStore.reduce((acc, p) => {
         acc[p.operador] = (acc[p.operador] || 0) + 1;
         return acc;
     }, {}),
     totalLateral: mexicoStore.reduce((acc, p) => acc + (parseFloat(p.longitud_lateral_m) || 0), 0)
  };

  const halDB = {
    brazil: { incidents: brzIncidents, contracts: halContracts },
    mexico: { details: mexicoStore, summary: mexSummary },
    lastUpdated: new Date().toISOString()
  };

  fs.mkdirSync(path.resolve(process.cwd(), 'api/data/processed'), {recursive: true});
  fs.writeFileSync(path.resolve(process.cwd(), 'api/data/processed/hal_db.json'), JSON.stringify(halDB, null, 2));
  console.log("HAL DB treated and saved.");
}

precomputeANP();
precomputeHAL();
