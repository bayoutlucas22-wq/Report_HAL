const dm = require('./api/data_manager');
dm.setStaticMode(true);
dm.getCollection('anp_records', { year: { $nin: [2026, '2026'] } }, { limit: 5 }).then(res => {
    console.log("Without 2026:", res.map(r => r.year));
});
dm.getCollection('anp_records', { year: { $in: [2026, '2026'] } }, { limit: 5 }).then(res => {
    console.log("Only 2026:", res.map(r => r.year));
});
