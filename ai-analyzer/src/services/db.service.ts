import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || '100.97.103.94',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'nexus_user',
  password: process.env.DB_PASSWORD || 'YoForex@101',
  database: process.env.DB_NAME || 'nexus_db',
});

// Create tables if they don't exist
const initDb = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS incidents (
      id SERIAL PRIMARY KEY,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      service VARCHAR(255),
      severity VARCHAR(50), -- e.g. low, medium, high, critical
      alert_name VARCHAR(255),
      summary TEXT,
      root_cause TEXT,
      suggested_fix TEXT,
      confidence INTEGER, -- 0-100 percentage
      status VARCHAR(50) DEFAULT 'OPEN', -- OPEN, INVESTIGATING, RESOLVED
      duration VARCHAR(50)
    );

    CREATE TABLE IF NOT EXISTS auth_logs (
      id SERIAL PRIMARY KEY,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      username VARCHAR(255),
      ip_address VARCHAR(50),
      status VARCHAR(50), -- SUCCESS, FAILED
      user_agent TEXT
    );

    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL, -- Storing as plain text for now as per user simplicity, but can upgrade to hash later
      role VARCHAR(50) DEFAULT 'admin'
    );
  `;
  try {
    await pool.query(query);
    console.log('Database initialized successfully.');
    
    // Seed default user if none exists
    const userCheck = await pool.query('SELECT COUNT(*) FROM users');
    if (parseInt(userCheck.rows[0].count) === 0) {
      console.log('Seeding default administrator...');
      await pool.query(
        'INSERT INTO users (username, password, role) VALUES ($1, $2, $3)',
        ['singhaanimesh216@gmail.com', 'YoForex@101', 'admin']
      );
    }
  } catch (err) {
    console.error('Failed to initialize database:', err);
  }
};

initDb();

export const verifyUser = async (username: string, password: string) => {
  const query = `SELECT * FROM users WHERE username = $1 AND password = $2`;
  try {
    const res = await pool.query(query, [username, password]);
    return res.rows[0] || null;
  } catch (err) {
    console.error('Error verifying user:', err);
    throw err;
  }
};

export const saveAuthLog = async (log: { username: string, ip: string, status: string, userAgent?: string }) => {
  const query = `
    INSERT INTO auth_logs (username, ip_address, status, user_agent)
    VALUES ($1, $2, $3, $4)
    RETURNING *;
  `;
  const values = [log.username, log.ip, log.status, log.userAgent || ''];
  try {
    const res = await pool.query(query, values);
    return res.rows[0];
  } catch (err) {
    console.error('Error saving auth log:', err);
    throw err;
  }
};

export const getAuthLogs = async (limit: number = 50) => {
  const query = `SELECT * FROM auth_logs ORDER BY timestamp DESC LIMIT $1`;
  try {
    const res = await pool.query(query, [limit]);
    return res.rows;
  } catch (err) {
    console.error('Error fetching auth logs:', err);
    throw err;
  }
};

export const saveIncident = async (incidentData: any) => {
  const query = `
    INSERT INTO incidents (service, severity, alert_name, summary, root_cause, suggested_fix, confidence, status, timestamp)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
    RETURNING *;
  `;
  const values = [
    incidentData.service,
    incidentData.severity || 'UNKNOWN',
    incidentData.alert_name,
    incidentData.summary,
    incidentData.root_cause,
    incidentData.suggested_fix,
    incidentData.confidence || 0,
    incidentData.status || 'OPEN'
  ];

  try {
    const res = await pool.query(query, values);
    return res.rows[0];
  } catch (err) {
    console.error('Error saving incident to DB:', err);
    throw err;
  }
};
