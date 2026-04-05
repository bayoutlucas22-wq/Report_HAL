const fs = require('fs');

const dashPath = './public/dashboard.html';
const appPath = './public/app.js';

let html = fs.readFileSync(dashPath, 'utf8');
let js = fs.readFileSync(appPath, 'utf8');

// 1. HTML modifications
// Insert Sidebar link
const sidebarTarget = `        <a href="#" class="nav-link" data-section="mexico-registry" id="nav-mexico-registry">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <ellipse cx="12" cy="12" rx="10" ry="10" />
            <path
              d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
          HAL MEX
        </a>`;

const norwayLink = `
        <a href="#" class="nav-link" data-section="norway-registry" id="nav-norway-registry">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
          </svg>
          Norway / HAVTIL
        </a>`;

if (!html.includes('id="nav-norway-registry"')) {
    html = html.replace(sidebarTarget, sidebarTarget + norwayLink);
}

// Extract the brazil registry section string and replace it with norway
const brzStart = '<!-- ── BRAZIL INCIDENT REGISTRY standalone section ── -->';
const brzEnd = '</section><!-- /section-brazil-registry -->';

if (html.includes(brzStart) && !html.includes('id="section-norway-registry"')) {
    let brzSection = html.substring(html.indexOf(brzStart), html.indexOf(brzEnd) + brzEnd.length);
    
    // Cleanup anything referring strictly to Brazil
    let norwaySection = brzSection
        .replace(/BRAZIL INCIDENT REGISTRY standalone section/g, 'NORWAY INCIDENT REGISTRY standalone section')
        .replace(/section-brazil-registry/g, 'section-norway-registry')
        .replace(/BRAZIL · ANP FULL REGISTRY/g, 'NORWAY · HAVTIL FULL REGISTRY')
        .replace(/Brazil Incident Registry/g, 'Norway Incident Registry')
        .replace(/Complete Halliburton & Tejas relevant records. Sync with ANP SISO portal./g, 'Complete simulated records reflecting HAL exposure to North Sea trends and HAVTIL incident databases.')
        .replace(/regNumFilter/g, 'norwayNumFilter')
        .replace(/regYearFilter/g, 'norwayYearFilter')
        .replace(/regCatFilter/g, 'norwayCatFilter')
        .replace(/regSevFilter/g, 'norwaySevFilter')
        .replace(/filterIncidents/g, 'filterNorwayIncidents')
        .replace(/dashTotalString/g, 'norwayTotalString')
        .replace(/registryBody/g, 'norwayRegistryBody')
        .replace(/registryPagination/g, 'norwayRegistryPagination')
        .replace(/penaltyImpactPanel/g, 'norwayPenaltyImpactPanel');
        
    html = html.replace(brzEnd, brzEnd + "\n\n" + norwaySection);
}

// 2. JS modifications
const appVarsTarget = `let halIncidents = [];
let halPage = 1;
let halLimit = 20;
let halQuery = '';
let halYear = '';
let halCat = '';
let halSev = '';`;

const norwayVars = `
let norwayIncidents = [];
let norwayPage = 1;
let norwayLimit = 20;
let norwayQuery = '';
let norwayYear = '';
let norwayCat = '';
let norwaySev = '';`;

if (!js.includes('let norwayPage = 1;')) {
    js = js.replace(appVarsTarget, appVarsTarget + norwayVars);
}

const jsFetchBrz = `async function fetchHalIncidents(page = 1) {`;

if (!js.includes('fetchNorwayIncidents')) {
    // Add norway logic
    let norwayLogic = `

// ── Norway Integration ──────────────────────────────────────────────────
async function fetchNorwayIncidents(page = 1) {
  norwayPage = page;
  try {
    const params = new URLSearchParams({ page, limit: norwayLimit });
    if(norwayQuery) params.append("q", norwayQuery);
    if(norwayYear) params.append("year", norwayYear);
    if(norwayCat) params.append("category", norwayCat);
    if(norwaySev) params.append("severity", norwaySev);

    const res = await fetch("/api/norway-incidents?" + params);
    if(!res.ok) throw new Error("Fetch failed");
    const data = await res.json();
    renderNorwayIncidents(data);
  } catch(e) { console.error("Norway fetch:", e); }
}

function renderNorwayIncidents(data) {
  const tbody = document.getElementById("norwayRegistryBody");
  const totSpan = document.getElementById("norwayTotalString");
  if(!tbody) return;

  if(totSpan) totSpan.textContent = \`\${data.total.toLocaleString()} incidents\`;

  if(!data.items || !data.items.length) {
      tbody.innerHTML = \`<tr><td colspan="6" style="text-align:center;padding:30px;color:#8896ab;">No records found</td></tr>\`;
      return;
  }

  tbody.innerHTML = data.items.map(r => {
    return \`<tr>
      <td style="font-family:monospace;font-size:12px;font-weight:600;color:#334155;">\${r.numero}</td>
      <td style="font-weight:600;color:#0f172a;">\${r.year || '—'}</td>
      <td><span class="cs-badge \${getCatClass(r.category)}">\${r.category}</span></td>
      <td><span class="cs-badge \${getSevClass(r.severity)}">\${r.severity}</span></td>
      <td style="font-size:12px;color:#475569;">\${r.tipo}</td>
      <td style="font-size:11px;color:#475569;line-height:1.4">\${r.evento}</td>
    </tr>\`;
  }).join("");

  renderNorwayPagination(data.page, data.pages);
}

function renderNorwayPagination(current, total) {
  const pg = document.getElementById("norwayRegistryPagination");
  if(!pg) return;
  if(total <= 1) { pg.innerHTML = ""; return; }

  let html = \`\`;
  html += \`<button onclick="fetchNorwayIncidents(\${current-1})" \${current===1?'disabled':''} class="pg-btn">Prev</button>\`;
  html += \`<span style="font-size:13px;font-weight:600;color:#64748b;margin:0 10px;">Page \${current} of \${total}</span>\`;
  html += \`<button onclick="fetchNorwayIncidents(\${current+1})" \${current===total?'disabled':''} class="pg-btn">Next</button>\`;
  pg.innerHTML = html;
}

window.filterNorwayIncidents = function() {
  const qEl = document.getElementById("norwayNumFilter");
  const yEl = document.getElementById("norwayYearFilter");
  const cEl = document.getElementById("norwayCatFilter");
  const sEl = document.getElementById("norwaySevFilter");

  norwayQuery = qEl ? qEl.value : "";
  norwayYear = yEl ? yEl.value : "";
  norwayCat = cEl ? cEl.value : "";
  norwaySev = sEl ? sEl.value : "";
  fetchNorwayIncidents(1);
};
`;
    js = js.replace(jsFetchBrz, norwayLogic + "\n" + jsFetchBrz);
}

// In app.js route handling
const showSectionMatch = `if (section === 'brazil-registry') {
    fetchHalIncidents(1);
  }`;
  
const showNorway = `if (section === 'norway-registry') {
    fetchNorwayIncidents(1);
  }`;

if (!js.includes("section === 'norway-registry'")) {
    js = js.replace(showSectionMatch, showSectionMatch + "\n  " + showNorway);
}

fs.writeFileSync(dashPath, html);
fs.writeFileSync(appPath, js);
console.log("Successfully patched HTML and JS to inject Norway Dashboard code.");
