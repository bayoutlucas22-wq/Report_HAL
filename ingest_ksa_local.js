const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

async function start() {
    const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/';
    const client = new MongoClient(mongoUrl);
    await client.connect();
    const db = client.db('hal_tejas_db');
    
    // Clean old KSA records
    await db.collection('hal_incidents').deleteMany({ region: 'KSA' });
    
    const baseDir = './api/docs/aramco/text';
    const years = ['2020','2021','2022','2024','2025'];
    let allRecords = [];

    for (const year of years) {
        const yearDir = path.join(baseDir, year);
        if (!fs.existsSync(yearDir)) continue;
        const files = fs.readdirSync(yearDir);
        for (const file of files) {
            const content = fs.readFileSync(path.join(yearDir, file), 'utf8');
            allRecords.push({
                region: 'KSA',
                wlbEntryYear: parseInt(year),
                wlbWellboreName: file.replace('.txt', ''),
                wlbDrillingOperator: 'Saudi Aramco',
                raw_content: content,
                category: 'Corporate Filing',
                severity: 'Financial/ESG'
            });
        }
    }

    if (allRecords.length > 0) {
        await db.collection('hal_incidents').insertMany(allRecords);
        console.log('✓ SUCCESS: Loaded ' + allRecords.length + ' KSA records into your LOCAL MongoDB!');
    }
    process.exit(0);
}
start().catch(e => { console.error(e); process.exit(1); });
