const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  host: 'postgres',
  user: 'nexus_user',
  password: 'YoForex@101',
  database: 'nexus_db',
});

const run = async () => {
  try {
    const h = await bcrypt.hash('1234qwer', 10);
    const res = await pool.query('UPDATE users SET password = $1 WHERE username = $2', [h, 'singhaanimesh216@gmail.com']);
    console.log(`Updated ${res.rowCount} rows`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();
