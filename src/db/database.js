const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const config = require('../config/config');

let db;

async function initDatabase() {
  const adapter = new JSONFile(config.dbPath);
  db = new Low(adapter, { services: [], requests: [] });

  await db.read();
  db.data ||= { services: [], requests: [] };
  await db.write();

  return db;
}

function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

module.exports = { initDatabase, getDatabase };
