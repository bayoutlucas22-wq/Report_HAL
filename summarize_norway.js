const fs = require('fs');

const norwayCsv = 'wellbore_exploration_all.csv';
if (!fs.existsSync(norwayCsv)) {
    console.error("Norway CSV not found");
    process.exit(1);
}

const content = fs.readFileSync(norwayCsv, 'utf8');
const lines = content.split('\n').filter(l => l.trim());
const headers = lines[0].split(',');

const opIdx = headers.indexOf('Current operator');
const fieldIdx = headers.indexOf('Field');
const statusIdx = headers.indexOf('Status');
const contentIdx = headers.indexOf('Content');

const operators = {};
const fields = {};
const statusMap = {};

lines.slice(1).forEach(line => {
    const cols = line.split(',');
    const op = cols[opIdx]?.trim();
    const field = cols[fieldIdx]?.trim();
    const status = cols[statusIdx]?.trim();
    
    if (op) operators[op] = (operators[op] || 0) + 1;
    if (field) fields[field] = (fields[field] || 0) + 1;
    if (status) statusMap[status] = (statusMap[status] || 0) + 1;
});

const topOps = Object.entries(operators)
    .sort((a,b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

const topFields = Object.entries(fields)
    .filter(([name]) => name && name !== "")
    .sort((a,b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

console.log("TOP OPERATORS (NORWAY):", JSON.stringify(topOps, null, 2));
console.log("TOP FIELDS (NORWAY):", JSON.stringify(topFields, null, 2));
console.log("STATUS DISTRIBUTION:", JSON.stringify(statusMap, null, 2));
