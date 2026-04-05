const fs = require('fs');

function generateContracts(region, filename, companies, objects) {
  const NUM_CONTRACTS = 65;
  const records = ["idx;ano;mes;numero;uf;modalidade;proc;tipo;empresa;obj;valor;inicio;fim;value"];
  
  const domains = [
    { k: "ciment", dom: "Cementing" },
    { k: "estimul", dom: "Stimulation" },
    { k: "fluidos", dom: "Fluids" },
    { k: "complet", dom: "Completion" },
    { k: "mpd", dom: "MPD" },
    { k: "workover", dom: "Workover" },
    { k: "constru", dom: "Well Construction" },
    { k: "geol", dom: "G&G Software" }
  ];

  for (let i = 0; i < NUM_CONTRACTS; i++) {
    const year = 2020 + Math.floor(Math.random() * 7); // 2020 to 2026
    const num = `${region}-${year}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`;
    const dom = domains[Math.floor(Math.random() * domains.length)];
    
    const objPrefix = objects[Math.floor(Math.random() * objects.length)];
    const obj = `${objPrefix} ${dom.k} - High Criticality Service`;
    
    const company = companies[Math.floor(Math.random() * companies.length)];
    const valStr = region === 'MEX' ? `$ ${Math.floor(Math.random() * 50 + 5)},000,000.00 MXN` :
                 region === 'ARG' ? `$ ${Math.floor(Math.random() * 400 + 50)},000,000.00 ARS` : 
                 `kr ${Math.floor(Math.random() * 100 + 10)},000,000.00 NOK`;

    records.push(`${i};${year};01;${num};XX;LIC;PUBLIC;SERVICE;${company};${obj};0;01/01/${year};31/12/${year+3};${valStr}`);
  }
  
  fs.writeFileSync(filename, records.join('\n'));
  console.log(`Generated ${NUM_CONTRACTS} ${region} contracts -> ${filename}`);
}

generateContracts('MEX', './api/data/mex_contracts.csv', 
  ["PEMEX EXPLORACIÓN Y PRODUCCIÓN", "GRUPO PROTEXA", "COTEMAR", "DIAVAZ", "HALLIBURTON DE MEXICO"],
  ["Provisión de servicios de", "Suministro de materiales para", "Servicios integrales de", "Ejecución de trabajos de"]
);

generateContracts('ARG', './api/data/arg_contracts.csv', 
  ["YPF S.A.", "PAN AMERICAN ENERGY", "TECPETROL", "PLUSPETROL", "HALLIBURTON ARGENTINA"],
  ["Provisión de servicios de", "Suministro de materiales para", "Servicios integrales de", "Ejecución de trabajos de"]
);

generateContracts('NOR', './api/data/norway_contracts.csv', 
  ["EQUINOR ASA", "AKER BP", "VAR ENERGI", "WINTERSHALL DEA", "HALLIBURTON AS"],
  ["Provision of offshore services for", "Supply of materials for", "Integrated operations for", "Execution of"]
);
