const fs = require('fs');
const path = require('path');
const { getDb } = require('./mongo');

/**
 * DataManager handles data retrieval for the application.
 * It provides a "Hybrid Mode":
 * 1. Primary: MongoDB (highly indexed, fast for large datasets like ANP incidents).
 * 2. Secondary/Fallback: Local Files (CSV/JSON) for when MongoDB is unavailable or empty.
 * 
 * This fulfills the requirement to "not believe in api" (being resilient to backend failures)
 * while still maintaining performance for production use.
 */

class DataManager {
    constructor() {
        this.dataDir = path.resolve(__dirname, 'data');
        this.processedDir = path.resolve(__dirname, 'data/processed');
        this.cache = new Map();
        this.isStaticMode = false;
    }

    /**
     * Set static mode (e.g., if MONGO_URL is missing or connection fails)
     */
    setStaticMode(enabled = true) {
        this.isStaticMode = enabled;
        if (enabled) console.warn('DataManager: Running in STATIC MODE (Files only).');
    }

    /**
     * Generic query method that handles DB vs File logic.
     */
    async getCollection(collectionName, filter = {}, options = {}) {
        if (this.isStaticMode) {
            return this.getFromFiles(collectionName, filter, options);
        }

        try {
            const db = await getDb();
            const col = db.collection(collectionName);
            
            if (options.countOnly) {
                const count = await col.countDocuments(filter);
                if (count === 0) {
                    const totalCount = await col.countDocuments({});
                    if (totalCount === 0) {
                        return this.getFromFiles(collectionName, filter, options);
                    }
                }
                return count;
            }

            let query = col.find(filter, { projection: options.projection || { _id: 0 } });

            if (options.sort) query = query.sort(options.sort);
            if (options.skip) query = query.skip(options.skip);
            if (options.limit) query = query.limit(options.limit);

            const results = await query.toArray();

            // If results are empty, check if the collection itself is empty and fall back to files.
            if (results.length === 0) {
                const totalCount = await col.countDocuments({});
                if (totalCount === 0) {
                    return this.getFromFiles(collectionName, filter, options);
                }
            }

            return results;
        } catch (err) {
            console.error(`DataManager: DB error for ${collectionName}, falling back to files.`, err.message);
            return this.getFromFiles(collectionName, filter, options);
        }
    }

    /**
     * Fallback logic to read from CSV/JSON.
     */
    async getFromFiles(collectionName, filter = {}, options = {}) {
        // Map collection names to filenames
        const fileMap = {
            'anp_records': 'processed/anp_records.json',
            'anp_stats': 'processed/anp_stats.json',
            'hal_contracts': 'hal-contracts-pbr.csv',
            'mex_contracts': 'mex_contracts.csv',
            'arg_contracts': 'arg_contracts.csv',
            'sodir_wellbores': 'wellbore_exploration_all.csv',
            'nor_incidents': 'norway_incidents.csv',
            'nor_contracts': 'norway_contracts.csv',
            'mex_perforacion': 'mexico_perforacion.csv',
            'hal_db': 'processed/hal_db.json'
        };

        const fileName = fileMap[collectionName];
        if (!fileName) return options.countOnly ? 0 : [];

        const filePath = path.join(this.dataDir, fileName);
        if (!fs.existsSync(filePath)) {
            console.error(`DataManager: File not found: ${filePath}`);
            return options.countOnly ? 0 : [];
        }

        // Basic in-memory caching for files
        if (!this.cache.has(fileName)) {
            let data = [];
            if (fileName.endsWith('.json')) {
                const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                data = Array.isArray(raw) ? raw : [raw];
            } else if (fileName.endsWith('.csv')) {
                let delimiter = ';';
                if (collectionName.includes('sodir') || collectionName.includes('perforacion')) {
                  delimiter = ',';
                }
                const rawData = this.parseCsv(fs.readFileSync(filePath, 'utf8'), delimiter);
                
                // Normalization layer for common regional headers
                data = rawData.map(row => {
                    const normalized = { ...row };
                    // Petrobras / Brazil transparency portal mapping
                    if (row['Número do contrato']) normalized.numero = row['Número do contrato'];
                    if (row['Objeto da contratação']) normalized.obj = row['Objeto da contratação'];
                    if (row['Valor do contrato']) normalized.value = row['Valor do contrato'];
                    if (row['Início da vigência']) normalized.inicio = row['Início da vigência'];
                    if (row['Fim da vigência']) normalized.fim = row['Fim da vigência'];
                    if (row['Número do processo']) normalized.proc = row['Número do processo'];
                    
                    // Norway Sodir FactPages mapping
                    if (row['wlbWellboreName']) normalized.wlbName = row['wlbWellboreName'];
                    if (row['wlbDrillingOperator']) normalized.wlbOperator = row['wlbDrillingOperator'];
                    if (row['wlbWellType']) normalized.wlbWellType = row['wlbWellType'];
                    if (row['wlbStatus']) normalized.wlbStatus = row['wlbStatus'];
                    if (row['wlbEntryYear']) normalized.wlbYear = row['wlbEntryYear'];
                    if (row['wlbField']) normalized.wlbField = row['wlbField'];
                    if (row['wlbTotalDepth']) normalized.wlbTotalDepth = row['wlbTotalDepth'];

                    // Maintain original property names too
                    return normalized;
                });
            }
            this.cache.set(fileName, data);
        }

        let results = this.cache.get(fileName);

        // Apply filters (very basic implementation)
        if (Object.keys(filter).length > 0 || true) {
            results = results.filter(item => {
                // GLOBAL PURGE: No 2026 data allowed in this platform
                if (item.year == 2026 || item.year == '2026' || item.wlbYear == 2026 || item.wlbYear == '2026') {
                    return false;
                }
                
                if (Object.keys(filter).length === 0) return true;

                return Object.entries(filter).every(([key, val]) => {
                    // special operators e.g. $or
                    if (key === '$or' && Array.isArray(val)) {
                        return val.some(orCond => {
                            return Object.entries(orCond).every(([orKey, orVal]) => {
                                if (orVal && typeof orVal === 'object' && orVal.$regex) {
                                    return new RegExp(orVal.$regex, orVal.$options || 'i').test(item[orKey]);
                                }
                                return String(item[orKey]) == String(orVal);
                            });
                        });
                    }
                    if (val && typeof val === 'object') {
                        if (val.$regex) {
                            const regex = new RegExp(val.$regex, val.$options || 'i');
                            return regex.test(item[key]);
                        }
                        if (val.$ne !== undefined) {
                            return String(item[key]) != String(val.$ne);
                        }
                        if (val.$nin !== undefined && Array.isArray(val.$nin)) {
                            return !val.$nin.some(ninVal => String(item[key]) == String(ninVal));
                        }
                        if (val.$in !== undefined && Array.isArray(val.$in)) {
                            return val.$in.some(inVal => String(item[key]) == String(inVal));
                        }
                    }
                    if (item[key] === undefined) return true; // ignore queries for fields not in static files if testing
                    return String(item[key]) == String(val);
                });
            });
        }

        if (options.countOnly) return results.length;

        if (options.sort) {
            results = [...results].sort((a, b) => {
                for (let [key, dir] of Object.entries(options.sort)) {
                    let aVal = a[key] !== undefined ? a[key] : '';
                    let bVal = b[key] !== undefined ? b[key] : '';
                    if (typeof aVal === 'string' && typeof bVal === 'string') {
                        let cmp = aVal.localeCompare(bVal);
                        if (cmp !== 0) return dir === -1 ? -cmp : cmp;
                    } else {
                        if (aVal > bVal) return dir === -1 ? -1 : 1;
                        if (aVal < bVal) return dir === -1 ? 1 : -1;
                    }
                }
                return 0;
            });
        }

        // Apply pagination
        const start = options.skip || 0;
        const limit = options.limit || results.length;
        return results.slice(start, start + limit);
    }

    parseCsv(content, delimiter = ';') {
        const lines = content.split('\n').filter(l => l.trim());
        if (lines.length < 2) return [];
        const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
        return lines.slice(1).map(line => {
            const parts = line.split(delimiter);
            const obj = {};
            headers.forEach((h, i) => {
                obj[h] = (parts[i] || '').trim().replace(/^"|"$/g, '');
            });
            return obj;
        });
    }

    async getStats(type) {
        if (type === 'anp') {
            const stats = await this.getCollection('anp_stats');
            if (stats && stats.length > 0) return stats[0];
            return {
                total: 0,
                categoryBreakdown: {},
                severityBreakdown: {},
                yearSeries: [],
                monthPattern: {}
            };
        }
        return null;
    }
}

const instance = new DataManager();
module.exports = instance;
