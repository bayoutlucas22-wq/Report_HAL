const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

async function start() {
    // Local MongoDB - Adjust if your local port is different
    const MONGO_URL = "mongodb://localhost:27017/hal_tejas_db";
    const client = await MongoClient.connect(MONGO_URL);
    const db = client.db();
    
    // Path to your local Aramco text files
    const target = './api/docs/aramco/text';
    
    if (!fs.existsSync(target)) {
        console.error("Could not find KSA data at:", path.resolve(target));
        process.exit(1);
    }

    const years = fs.readdirSync(target).filter(d => /^\d{4}$/.test(d));
    for (const year of years) {
        await db.collection('ksa_intelligence').updateOne(
            { year: parseInt(year) }, 
            { $set: { year: parseInt(year), company: 'Saudi Aramco', last_updated: new Date(), status: 'Ready' } }, 
            { upsert: true }
        );
        console.log(`  ✓ FY ${year} is now READY in your LOCAL MongoDB.`);
    }
    process.exit(0);
}
start().catch(e => { console.error(e); process.exit(1); });
