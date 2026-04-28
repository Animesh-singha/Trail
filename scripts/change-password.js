import bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load env from the parent ai-analyzer directory
dotenv.config({ path: path.join(process.cwd(), 'ai-analyzer', '.env') });

const pool = new Pool({
  host: 'localhost', // Run this from the VPS host
  port: 5433,        // Our safe port for the monitoring DB
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const changePassword = async (username, newPassword) => {
  try {
    console.log(`Updating password for ${username}...`);
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    const res = await pool.query(
      'UPDATE users SET password = $1 WHERE username = $2',
      [hashedPassword, username]
    );

    if (res.rowCount > 0) {
      console.log('✅ Password updated successfully!');
    } else {
      console.log('❌ User not found.');
    }
  } catch (err) {
    console.error('❌ Error updating password:', err);
  } finally {
    await pool.end();
  }
};

const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Usage: node scripts/change-password.js <username> <new_password>');
  process.exit(1);
}

changePassword(args[0], args[1]);
