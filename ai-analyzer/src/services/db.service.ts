import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

export const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

export const query = (text: string, params?: any[]) => pool.query(text, params);

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
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'admin'
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      user_id INTEGER REFERENCES users(id),
      action VARCHAR(100),
      target VARCHAR(255),
      command TEXT,
      status VARCHAR(50),
      result TEXT,
      source_ip VARCHAR(50),
      trace_id VARCHAR(100),
      duration_ms INTEGER
    );

    CREATE TABLE IF NOT EXISTS topology_nodes (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255),
      type VARCHAR(50), -- SERVER, APP, DB, DOMAIN
      status VARCHAR(50) DEFAULT 'online', -- online, warning, error
      metadata JSONB,
      last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS topology_edges (
      id SERIAL PRIMARY KEY,
      source_id VARCHAR(255) REFERENCES topology_nodes(id) ON DELETE CASCADE,
      target_id VARCHAR(255) REFERENCES topology_nodes(id) ON DELETE CASCADE,
      type VARCHAR(50), -- runs_on, serves, connects_to
      metadata JSONB,
      last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS endpoint_metrics (
      id SERIAL PRIMARY KEY,
      node_id VARCHAR(255) REFERENCES topology_nodes(id) ON DELETE CASCADE,
      route VARCHAR(255),
      method VARCHAR(10),
      status_code INTEGER,
      duration_ms INTEGER,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS topology_history (
      id SERIAL PRIMARY KEY,
      node_id VARCHAR(255),
      event_type VARCHAR(50), -- ADDED, REMOVED, STATE_CHANGE
      old_value JSONB,
      new_value JSONB,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS services (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      description TEXT,
      owner VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS service_members (
      service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
      node_id VARCHAR(255) REFERENCES topology_nodes(id) ON DELETE CASCADE,
      PRIMARY KEY (service_id, node_id)
    );

    CREATE TABLE IF NOT EXISTS topology_snapshots (
      id SERIAL PRIMARY KEY,
      snapshot_data JSONB NOT NULL,
      metadata JSONB,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      version INTEGER UNIQUE NOT NULL,
      description TEXT,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- TRUTH MODEL ENHANCEMENTS (topology_edges)
    DO $$ 
    BEGIN 
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='topology_edges' AND column_name='confidence') THEN
        ALTER TABLE topology_edges ADD COLUMN confidence FLOAT DEFAULT 1.0;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='topology_edges' AND column_name='source') THEN
        ALTER TABLE topology_edges ADD COLUMN source VARCHAR(50) DEFAULT 'inferred';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='topology_edges' AND column_name='last_verified') THEN
        ALTER TABLE topology_edges ADD COLUMN last_verified TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='topology_edges' AND column_name='manual_weight') THEN
        ALTER TABLE topology_edges ADD COLUMN manual_weight FLOAT DEFAULT 1.0;
      END IF;
    END $$;
  `;
  try {
    await pool.query(query);
    console.log('Database initialized successfully.');
    
    // Seed default user if none exists
    const userCheck = await pool.query('SELECT COUNT(*) FROM users');
    if (parseInt(userCheck.rows[0].count) === 0) {
      const seedUser = process.env.SEED_USER;
      const seedPass = process.env.SEED_PASS;
      
      if (!seedUser || !seedPass) {
        console.error('CRITICAL: SEED_USER or SEED_PASS not defined in .env. Skipping default user creation.');
      } else {
        console.log(`Seeding default administrator (${seedUser})...`);
        const hashedPassword = await bcrypt.hash(seedPass, 10);
        await pool.query(
          'INSERT INTO users (username, password, role) VALUES ($1, $2, $3)',
          [seedUser, hashedPassword, 'admin']
        );
      }
    }
  } catch (err) {
    console.error('Failed to initialize database:', err);
  }
};

/**
 * Ensures that metrics partitions exist for today and tomorrow.
 * Partitions are named endpoint_metrics_yyyy_mm_dd
 */
export const ensureMetricPartitions = async () => {
  const dates = [0, 1].map(offset => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.toISOString().split('T')[0].replace(/-/g, '_');
  });

  for (const dateSuffix of dates) {
    const tableName = `endpoint_metrics_${dateSuffix}`;
    const sql = `CREATE TABLE IF NOT EXISTS ${tableName} (LIKE endpoint_metrics INCLUDING ALL)`;
    try {
      await pool.query(sql);
    } catch (err) {
      console.error(`Failed to create partition ${tableName}:`, err);
    }
  }
};

/**
 * Drop partitions older than N days (Default 7)
 */
export const pruneMetricPartitions = async (days: number = 7) => {
  // Logic to list tables starting with endpoint_metrics_ and drop those older than N days
  // For basic elite MVP, we'll implement this as a scheduled task
};

// Migration interface moved below

export interface Migration {
  version: number;
  description: string;
  up: () => Promise<void>;
  down: () => Promise<void>;
}

export class MigrationRunner {
  private static migrations: Migration[] = [];

  static register(migration: Migration) {
    this.migrations.push(migration);
    this.migrations.sort((a, b) => a.version - b.version);
  }

  static async run() {
    console.log('[Migrations] Checking for pending updates...');
    const res = await query('SELECT version FROM schema_migrations');
    const applied = new Set(res.rows.map(r => r.version));

    for (const m of this.migrations) {
      if (!applied.has(m.version)) {
        console.log(`[Migrations] Applying v${m.version}: ${m.description}`);
        try {
          await m.up();
          await query('INSERT INTO schema_migrations (version, description) VALUES ($1, $2)', [m.version, m.description]);
        } catch (err) {
          console.error(`[Migrations] CRITICAL: Failed to apply v${m.version}`, err);
          throw err;
        }
      }
    }
  }

  static async rollback(version: number) {
    const m = this.migrations.find(migration => migration.version === version);
    if (!m) throw new Error(`Migration v${version} not found`);
    
    console.log(`[Migrations] Rolling back v${m.version}: ${m.description}`);
    await m.down();
    await query('DELETE FROM schema_migrations WHERE version = $1', [version]);
  }
}

// REGISTER V1 MIGRATION: Elite Truth Model
MigrationRunner.register({
  version: 1,
  description: 'Elite Truth Model: Add confidence, source and weight columns to edges',
  up: async () => {
    await query(`
      ALTER TABLE topology_edges ADD COLUMN IF NOT EXISTS confidence FLOAT DEFAULT 1.0;
      ALTER TABLE topology_edges ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'inferred';
      ALTER TABLE topology_edges ADD COLUMN IF NOT EXISTS last_verified TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE topology_edges ADD COLUMN IF NOT EXISTS manual_weight FLOAT DEFAULT 1.0;
    `);
  },
  down: async () => {
    await query(`
      ALTER TABLE topology_edges DROP COLUMN IF EXISTS confidence;
      ALTER TABLE topology_edges DROP COLUMN IF EXISTS source;
      ALTER TABLE topology_edges DROP COLUMN IF EXISTS last_verified;
      ALTER TABLE topology_edges DROP COLUMN IF EXISTS manual_weight;
    `);
  }
});

// Auto-run migrations on start
initDb()
  .then(() => ensureMetricPartitions())
  .then(() => MigrationRunner.run())
  .catch(err => console.error('Startup failure:', err));

export const verifyUser = async (username: string, password: string) => {
  const sql = `SELECT * FROM users WHERE username = $1`;
  try {
    const res = await pool.query(sql, [username]);
    if (res.rows.length === 0) return null;
    
    const user = res.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    
    return isMatch ? user : null;
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

export const saveAuditLog = async (log: { 
  userId: number, 
  action: string, 
  target: string, 
  command: string, 
  status: string, 
  result?: string,
  sourceIp?: string,
  traceId?: string,
  durationMs?: number
}) => {
  const query = `
    INSERT INTO audit_logs (user_id, action, target, command, status, result, source_ip, trace_id, duration_ms)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *;
  `;
  const values = [
    log.userId, 
    log.action, 
    log.target, 
    log.command, 
    log.status, 
    log.result || '',
    log.sourceIp || null,
    log.traceId || null,
    log.durationMs || null
  ];
  try {
    const res = await pool.query(query, values);
    return res.rows[0];
  } catch (err) {
    console.error('Error saving audit log:', err);
    throw err;
  }
};
