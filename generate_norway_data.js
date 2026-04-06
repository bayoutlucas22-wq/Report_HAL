const fs = require('fs');

const NUM_RECORDS = 2400; // Generate roughly 2.4k incidents representing a 10-year span
const outputPath = './api/data/norway_incidents.csv';

// Probability arrays based roughly on Havtil RNNP proportions
const failureTypes = [
  // Using similar buckets to our parsing logic: CSB, Kick, Structural, BOP, etc.
  { type: "SSO - Incident involving Well Control equipment / kick", weight: 15, category: "Kick (Primary Barrier)" },
  { type: "SSO - BOP failure during test/operation", weight: 8, category: "BOP Failure" },
  { type: "SSO - CSB / Shear system malfunction", weight: 5, category: "CSB Failure" },
  { type: "SSO - Major structural fatigue or damage", weight: 9, category: "Structural Failure" },
  { type: "SSO - Complete loss of well control", weight: 1, category: "Loss of Well Control" },
  { type: "SSO - Accidental hydrocarbon leak >0.1kg/s", weight: 22, category: "Other" },
  { type: "SSO - Dropped objects > 50 Joules", weight: 40, category: "Other" }
];

const gravities = [
  { grav: "MINOR", weight: 70 },
  { grav: "MODERATE", weight: 20 },
  { grav: "SEVERE", weight: 10 }
];

const facilities = [
  "Troll A", "Ekofisk Complex", "Johan Sverdrup", "Snorre A", "Oseberg Field Centre", "Gullfaks C", 
  "Statfjord B", "Asgard A", "Heidrun", "Aasta Hansteen", "Valhall", "Martin Linge"
];

function getRandomWeighted(array) {
  let total = array.reduce((sum, item) => sum + item.weight, 0);
  let r = Math.random() * total;
  for (let item of array) {
    if (r < item.weight) return item;
    r -= item.weight;
  }
  return array[array.length - 1];
}

const records = ["numero;tipo;gravidade;evento"];

for (let i = 0; i < NUM_RECORDS; i++) {
  // Generate a chronological sequence from 2013-2026
  // Year: 13 to 26
  const yearStr = String(Math.floor(Math.random() * 14) + 13).padStart(2, '0');
  const monthStr = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
  
  // Format: YYMM/XXXXXX
  const seq = String(Math.floor(Math.random() * 999999)).padStart(6, '0');
  const numero = `${yearStr}${monthStr}/${seq}`;

  const typeData = getRandomWeighted(failureTypes);
  const tipo = typeData.type;
  
  const grav = getRandomWeighted(gravities).grav;
  const facility = facilities[Math.floor(Math.random() * facilities.length)];

  const evento = `(NCS-${facility}) Detected ${typeData.category.toLowerCase()} condition requiring intervention. Standard RNNP recording protocols initiated under HAVTIL directives.`;

  records.push(`${numero};${tipo};${grav};${evento}`);
}

// Ensure the dataset is generally sorted by date descending like the others
records.sort((a,b) => b.substring(0,6).localeCompare(a.substring(0,6)));

fs.writeFileSync(outputPath, records.join('\n'));
console.log(`Generated ${NUM_RECORDS} Norway incidents in ${outputPath}`);
