const fs = require('fs');

// Patch server.js
let serverJs = fs.readFileSync('./api/server.js', 'utf8');
const parseHalContractsStr = `function parseHalContracts() {
  const csvPath = locate("api/data/hal-contracts-pbr.csv");`;

if (!serverJs.includes('parseMexicoContracts')) {
  const customParsers = `
function parseGenericContracts(filename) {
  const csvPath = locate("api/data/" + filename);
  if (!csvPath) return [];
  const csvContent = fs.readFileSync(csvPath, "utf8");
  const lines = csvContent.split("\\n").filter(Boolean);
  return lines.slice(1).map(line => {
    const parts = line.split(";");
    return {
      numero: parts[3]?.trim() || "—",
      obj:    parts[9]?.trim() || "No description provided",
      proc:   parts[6]?.trim() || "PUBLIC",
      inicio: parts[11]?.trim() || "?",
      fim:    parts[12]?.trim() || "?",
      value:  parts[13]?.trim() || "—",
    };
  });
}
`;
  serverJs = serverJs.replace(parseHalContractsStr, customParsers + "\\n" + parseHalContractsStr);

  const contractApis = `
app.get("/api/mexico-contracts", async (req, res) => { res.json({ items: parseGenericContracts("mex_contracts.csv") }); });
app.get("/api/argentina-contracts", async (req, res) => { res.json({ items: parseGenericContracts("arg_contracts.csv") }); });
app.get("/api/norway-contracts", async (req, res) => { res.json({ items: parseGenericContracts("norway_contracts.csv") }); });
`;
  serverJs = serverJs.replace('app.get("/api/hal-contracts"', contractApis + "\\n" + 'app.get("/api/hal-contracts"');
  fs.writeFileSync('./api/server.js', serverJs);
}


// Patch dashboard.html
let html = fs.readFileSync('./public/dashboard.html', 'utf8');
function injectContractPanel(sectionId, prefix, titleSuffix) {
  const insertionPoint = `</section><!-- /${sectionId} -->`;
  if(!html.includes(insertionPoint)) return;
  if(html.includes(`id="${prefix}ContractSearch"`)) return; // already injected

  const template = `
          <!-- ── CONTRACT EVIDENCE TABLE FOR ${prefix.toUpperCase()} ── -->
          <div class="panel cs-panel" style="margin-top:14px; margin-bottom:40px;">
            <div class="panel-header">
              <div>
                <div class="cs-section-num">C</div>
                <div class="panel-title">Key Contracts — High-Criticality Evidence Records</div>
                <div class="panel-subtitle">Contracts from ${titleSuffix} open data with highest direct intersection with CSB failure categories</div>
              </div>
              <div style="display:flex;gap:8px;align-items:center;">
                <input type="text" id="${prefix}ContractSearch" class="search-input" placeholder="Search contract / service…" style="width:200px;" oninput="filter${prefix}Contracts()">
                <select id="${prefix}ContractDomainFilter" class="search-input" style="width:160px;" onchange="filter${prefix}Contracts()">
                  <option value="">All Domains</option>
                  <option value="Cementing">Cementing</option>
                  <option value="Completion">Completion / DHSV</option>
                  <option value="Stimulation">Stimulation</option>
                  <option value="Fluids">Fluid Services</option>
                  <option value="MPD">MPD</option>
                  <option value="Well Construction">Well Construction</option>
                  <option value="Workover">Workover</option>
                  <option value="G&G Software">G&G Software</option>
                </select>
              </div>
            </div>
            <div style="overflow-x:auto;">
              <table class="cs-table" style="table-layout:fixed;">
                <thead>
                  <tr>
                    <th style="width:100px;">Contract #</th>
                    <th style="width:140px;">Service Domain</th>
                    <th>Object (Excerpt)</th>
                    <th style="width:120px;">Value</th>
                    <th style="width:140px;">CSB Link</th>
                  </tr>
                </thead>
                <tbody id="${prefix}ContractEvidenceBody">
                  <tr><td colspan="5" style="text-align:center;color:#8896ab;padding:24px">Loading evidence records...</td></tr>
                </tbody>
              </table>
            </div>
            <div style="display:flex;justify-content:center;padding:16px;gap:8px" id="${prefix}ContractPagination"></div>
          </div>
`;
  html = html.replace(insertionPoint, template + "\\n" + insertionPoint);
}

injectContractPanel("section-mexico-registry", "mexico", "Pemex / CNH");
injectContractPanel("section-argentina-registry", "argentina", "YPF / Secretaria de Energia");
injectContractPanel("section-norway-registry", "norway", "Equinor / HAVTIL");
fs.writeFileSync('./public/dashboard.html', html);


// Patch app.js
let appJs = fs.readFileSync('./public/app.js', 'utf8');

if (!appJs.includes('mexicoContracts = []')) {
  const newJs = `
let mexicoContracts = [];
let argentinaContracts = [];
let norwayContracts = [];
let fMexicoContracts = [];
let fArgentinaContracts = [];
let fNorwayContracts = [];
let mexCPage=1, argCPage=1, norCPage=1;

function processRegionalContracts(rawItems) {
  return rawItems.map(c => {
    const obj = (c.obj || "").toLowerCase();
    let domain = "Other";
    if (obj.includes("ciment")) domain = "Cementing";
    else if (obj.includes("estimul")) domain = "Stimulation";
    else if (obj.includes("fluidos") || obj.includes("fluid")) domain = "Fluids";
    else if (obj.includes("complet")) domain = "Completion";
    else if (obj.includes("mpd")) domain = "MPD";
    else if (obj.includes("workover") || obj.includes("interven") || obj.includes("operations")) domain = "Workover";
    else if (obj.includes("constru") || obj.includes("execution")) domain = "Well Construction";
    else if (obj.includes("g&g") || obj.includes("geol")) domain = "G&G Software";

    return {
      numero: c.numero || "—",
      domain: domain,
      obj: c.obj || "No description provided",
      value: c.value || "—",
      csbLink: getCSBLink(domain)
    };
  });
}

function renderRegionalTable(prefix, page, data) {
  const tbody = document.getElementById(prefix + "ContractEvidenceBody");
  if (!tbody) return;
  const PAGE_SIZE = 12;
  const start = (page - 1) * PAGE_SIZE;
  const slice = data.slice(start, start + PAGE_SIZE);

  if (!slice.length) {
    tbody.innerHTML = \`<tr><td colspan="5" style="text-align:center;color:#8896ab;padding:24px">No contracts match the current filter</td></tr>\`;
    return;
  }

  tbody.innerHTML = slice.map(c => {
    const domLabel = DOMAIN_MAP[c.domain] || c.domain;
    return \`<tr>
      <td style="font-family:monospace;font-size:11px;font-weight:700;color:var(--blue)">\${c.numero}</td>
      <td><span style="font-size:11px;font-weight:700;color:var(--text)">\${domLabel}</span></td>
      <td style="max-width:260px;font-size:11px;color:var(--text2);line-height:1.5;">\${c.obj.substring(0, 130)}\${c.obj.length > 130 ? '…' : ''}</td>
      <td style="font-weight:700;color:var(--text);white-space:nowrap;">\${c.value}</td>
      <td style="font-size:12px;font-weight:700;white-space:nowrap;">\${c.csbLink}</td>
    </tr>\`;
  }).join('');

  // pagination
  const pg = document.getElementById(prefix + "ContractPagination");
  if(pg) {
      const pages = Math.ceil(data.length / PAGE_SIZE);
      if(pages<=1) { pg.innerHTML=""; return;}
      pg.innerHTML = \`
        <button onclick="change\${prefix}Page(\${page-1})" \${page===1?'disabled':''} class="pg-btn">Prev</button>
        <span style="font-size:13px;font-weight:600;color:#64748b;margin:0 10px;">Page \${page} of \${pages}</span>
        <button onclick="change\${prefix}Page(\${page+1})" \${page===pages?'disabled':''} class="pg-btn">Next</button>
      \`;
  }
}

window.filtermexicoContracts = function() {
    const q = (document.getElementById('mexicoContractSearch')?.value||'').toLowerCase();
    const domain = (document.getElementById('mexicoContractDomainFilter')?.value||'').toLowerCase();
    fMexicoContracts = mexicoContracts.filter(c => {
        const dText = (c.domain||'').toLowerCase();
        return (!domain || dText.includes(domain)) && (!q || (c.numero+dText+c.obj).toLowerCase().includes(q));
    });
    mexCPage = 1;
    renderRegionalTable('mexico', mexCPage, fMexicoContracts);
};
window.changemexicoPage = function(p) { mexCPage=p; renderRegionalTable('mexico', mexCPage, fMexicoContracts); };

window.filterargentinaContracts = function() {
    const q = (document.getElementById('argentinaContractSearch')?.value||'').toLowerCase();
    const domain = (document.getElementById('argentinaContractDomainFilter')?.value||'').toLowerCase();
    fArgentinaContracts = argentinaContracts.filter(c => {
        const dText = (c.domain||'').toLowerCase();
        return (!domain || dText.includes(domain)) && (!q || (c.numero+dText+c.obj).toLowerCase().includes(q));
    });
    argCPage = 1;
    renderRegionalTable('argentina', argCPage, fArgentinaContracts);
};
window.changeargentinaPage = function(p) { argCPage=p; renderRegionalTable('argentina', argCPage, fArgentinaContracts); };

window.filternorwayContracts = function() {
    const q = (document.getElementById('norwayContractSearch')?.value||'').toLowerCase();
    const domain = (document.getElementById('norwayContractDomainFilter')?.value||'').toLowerCase();
    fNorwayContracts = norwayContracts.filter(c => {
        const dText = (c.domain||'').toLowerCase();
        return (!domain || dText.includes(domain)) && (!q || (c.numero+dText+c.obj).toLowerCase().includes(q));
    });
    norCPage = 1;
    renderRegionalTable('norway', norCPage, fNorwayContracts);
};
window.changenorwayPage = function(p) { norCPage=p; renderRegionalTable('norway', norCPage, fNorwayContracts); };

`;
  appJs = appJs.replace("function processIncomingContracts(rawItems)", newJs + "\\nfunction processIncomingContracts(rawItems)");

  const initFetchStr = `const [stats, tableData, contractData, mexData] = await Promise.all([`;
  const initFetchReplacement = `const [stats, tableData, contractData, mexData, mexC, argC, norC] = await Promise.all([`;
  const initPromisesReplacement = `
      fetchMexicoMetrics().catch(e => { console.error("Mexico fail", e); return { details: [], summary: {} }; }),
      fetch("/api/mexico-contracts").then(r=>r.json()).catch(()=>({items:[]})),
      fetch("/api/argentina-contracts").then(r=>r.json()).catch(()=>({items:[]})),
      fetch("/api/norway-contracts").then(r=>r.json()).catch(()=>({items:[]}))
    ]);
  `;
  appJs = appJs.replace(initFetchStr, initFetchReplacement);
  appJs = appJs.replace(`fetchMexicoMetrics().catch(e => { console.error("Mexico fail", e); return { details: [], summary: {} }; })
    ]);`, initPromisesReplacement);

  const initAssignmentStr = `
    if (mexC && mexC.items) { mexicoContracts = processRegionalContracts(mexC.items); window.filtermexicoContracts(); }
    if (argC && argC.items) { argentinaContracts = processRegionalContracts(argC.items); window.filterargentinaContracts(); }
    if (norC && norC.items) { norwayContracts = processRegionalContracts(norC.items); window.filternorwayContracts(); }
  `;
  appJs = appJs.replace('if (stats) {', initAssignmentStr + "\\n    if (stats) {");

  fs.writeFileSync('./public/app.js', appJs);
}
console.log('Successfully patched regional contracts logic.');
