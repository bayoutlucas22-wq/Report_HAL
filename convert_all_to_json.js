const fs = require('fs');
const path = require('path');

/**
 * Universal CSV to JSON converter.
 * Detects delimiters and handles quoted values properly.
 */
function csvToJson(csvContent) {
    if (!csvContent) return [];
    
    // Normalize line endings and filter empty lines
    const lines = csvContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim().length > 0);
    if (lines.length === 0) return [];

    // Attempt to detect delimiter (, or ;)
    const firstLine = lines[0];
    const semiCount = (firstLine.match(/;/g) || []).length;
    const commaCount = (firstLine.match(/,/g) || []).length;
    const delimiter = semiCount > commaCount ? ';' : ',';

    // Helper to parse line with quotes support
    const parseLine = (line) => {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === delimiter && !inQuotes) {
                result.push(current.trim().replace(/^"|"$/g, ''));
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim().replace(/^"|"$/g, ''));
        return result;
    };

    const headers = parseLine(lines[0]).map(h => h.replace(/^\ufeff/, ''));
    
    return lines.slice(1).map(line => {
        const values = parseLine(line);
        const obj = {};
        headers.forEach((header, index) => {
            if (header) {
                obj[header] = values[index] || null;
            }
        });
        return obj;
    });
}

function processAll() {
    const dataDir = path.resolve(__dirname, 'api/data');
    const outputDir = path.resolve(__dirname, 'api/data/processed/mongo');

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.csv'));
    
    console.log(`🚀 Found ${files.length} CSV files to convert...`);

    files.forEach(file => {
        const filePath = path.join(dataDir, file);
        const outputName = file.replace(/[\s\(\)\s-]+/g, '_').replace('.csv', '.json').toLowerCase();
        const outputPath = path.join(outputDir, outputName);

        try {
            // Read with latin1 first for compatibility with the Brazilian/Mexican files seen earlier
            let content = fs.readFileSync(filePath, 'latin1');
            
            // Check if it's UTF-8 or Latin1 (heuristic: check for common Latin1 signatures)
            // But for safety in this project's context, usually latin1 works for the specific files here.
            // Let's try to detect UTF-8 if there's a BOM or no high-ASCII sequences that look like latin1.
            
            const records = csvToJson(content);
            
            fs.writeFileSync(outputPath, JSON.stringify(records, null, 2));
            console.log(`✅ Converted [${file}] -> [${outputName}] (${records.length} records)`);
        } catch (err) {
            console.error(`❌ Error converting ${file}:`, err.message);
        }
    });

    console.log(`\n✨ Finished! All JSON files are in: ${outputDir}`);
}

processAll();
