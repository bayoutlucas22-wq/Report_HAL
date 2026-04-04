const fs = require('fs');
const readline = require('readline');
const { MongoClient } = require('mongodb');

// Connection URL
const url = process.env.MONGO_URL || 'mongodb://localhost:27017';
const dbName = 'hal_tejas_db';
const CHUNK_SIZE = 5000; // Optimal chunk size for batch inserts

/**
 * Robust CSV parser for large files using stream
 */
async function processCsvInChunks(filePath, collectionName, db) {
    console.log(`🚀 Starting ingestion for [${path.basename(filePath)}] into [${collectionName}]...`);
    
    const fileStream = fs.createReadStream(filePath, 'latin1');
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let headers = [];
    let chunk = [];
    let totalImported = 0;
    let delimiter = ',';
    let isFirstLine = true;

    for await (const line of rl) {
        if (!line.trim()) continue;

        if (isFirstLine) {
            // Detect delimiter on first line
            const semiCount = (line.match(/;/g) || []).length;
            const commaCount = (line.match(/,/g) || []).length;
            delimiter = semiCount > commaCount ? ';' : ',';
            
            headers = parseCsvLine(line, delimiter).map(h => h.replace(/^\ufeff/, '').replace(/[\s\(\)\.]+/g, '_').toLowerCase());
            isFirstLine = false;
            continue;
        }

        const values = parseCsvLine(line, delimiter);
        const obj = {};
        headers.forEach((h, i) => { if (h) obj[h] = values[i] || null; });
        
        chunk.push(obj);

        if (chunk.length >= CHUNK_SIZE) {
            await db.collection(collectionName).insertMany(chunk);
            totalImported += chunk.length;
            console.log(`📦 Imported ${totalImported} records...`);
            chunk = [];
        }
    }

    if (chunk.length > 0) {
        await db.collection(collectionName).insertMany(chunk);
        totalImported += chunk.length;
    }

    console.log(`✅ Finished ${collectionName}: ${totalImported} total records.`);
}

function parseCsvLine(line, delimiter) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') inQuotes = !inQuotes;
        else if (char === delimiter && !inQuotes) {
            result.push(current.trim().replace(/^"|"$/g, ''));
            current = '';
        } else current += char;
    }
    result.push(current.trim().replace(/^"|"$/g, ''));
    return result;
}

const path = require('path');

async function main() {
    const client = new MongoClient(url);
    try {
        await client.connect();
        console.log('🔗 Connected to MongoDB server');
        const db = client.db(dbName);
        
        const dataDir = path.resolve(__dirname, 'api/data');
        const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.csv'));

        for (const file of files) {
            const collectionName = file.replace(/[\s\(\)\s-]+/g, '_').replace('.csv', '').toLowerCase();
            const filePath = path.join(dataDir, file);
            await processCsvInChunks(filePath, collectionName, db);
        }

    } catch (err) {
        console.error('❌ Error during ingestion:', err);
    } finally {
        await client.close();
    }
}

main();
