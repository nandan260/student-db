const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/student_db';

const isRemote = connectionString.includes('sslmode=require') || 
                 !connectionString.includes('localhost') && 
                 !connectionString.includes('127.0.0.1');

const pool = new Pool({
  connectionString,
  ssl: isRemote ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000
});

let isConnected = false;

async function checkConnection() {
  try {
    const res = await pool.query('SELECT NOW() as current_time, current_database() as db_name');
    isConnected = true;
    return { ok: true, time: res.rows[0].current_time, db: res.rows[0].db_name };
  } catch (err) {
    isConnected = false;
    return { ok: false, error: err.message };
  }
}

async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  // console.log('executed query', { text: text.slice(0, 60), duration, rows: res.rowCount });
  return res;
}

async function initDb() {
  const status = await checkConnection();
  if (!status.ok) {
    console.warn(`[DB WARNING] PostgreSQL connection failed: ${status.error}`);
    console.warn(`[DB HINT] Verify DATABASE_URL in .env (or provide a free cloud Neon/Supabase PostgreSQL connection).`);
    return false;
  }

  console.log(`[DB CONNECTED] Successfully connected to PostgreSQL database: "${status.db}" at ${status.time}`);
  
  try {
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    await pool.query(schemaSql);
    console.log('[DB SCHEMA] Schema tables verified / initialized successfully.');

    // Auto-seed if empty
    const checkStudents = await pool.query('SELECT COUNT(*) FROM students');
    if (parseInt(checkStudents.rows[0].count, 10) === 0) {
      console.log('[DB SEED] Empty database detected. Seeding 17-module dataset...');
      const { seedData } = require('./seed');
      await seedData();
      console.log('[DB SEED] Database seeding complete.');
    }
    return true;
  } catch (err) {
    console.error('[DB ERROR] Failed executing schema/seed:', err);
    return false;
  }
}

module.exports = {
  pool,
  query,
  checkConnection,
  initDb,
  isConnected: () => isConnected
};
