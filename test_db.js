const { getDatabase } = require('./api/data_store.js');

(async () => {
  const db = await getDatabase();
  console.log("Contracts loaded:", db.brazil.contracts.length);
  if (db.brazil.contracts.length > 0) {
    console.log("First contract:", db.brazil.contracts[0]);
  }
})();
