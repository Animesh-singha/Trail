import { exec } from 'child_process';
import util from 'util';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const execPromise = util.promisify(exec);

export const executeDatabaseBackup = async (target: string): Promise<any> => {
  try {
    const backupDir = path.join(process.cwd(), 'backups');
    
    // Ensure backups directory exists
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `nexus_db_${target}_${timestamp}.dump`;
    const outputPath = path.join(backupDir, filename);

    // Get DB credentials from env
    const host = process.env.DB_HOST || '100.97.103.94';
    const port = process.env.DB_PORT || '5432';
    const user = process.env.DB_USER || 'nexus_user';
    const password = process.env.DB_PASSWORD || 'YoForex@101';
    const dbName = process.env.DB_NAME || 'nexus_db';

    // Construct the pg_dump command
    // Using PGPASSWORD env variable inline on windows requires cross-env usually, 
    // but we can pass it securely via the 'env' option in exec
    const command = `pg_dump -h ${host} -p ${port} -U ${user} -F c -f "${outputPath}" ${dbName}`;

    console.log(`Starting backup for target ${target}: ${filename}`);
    
    let stdout, stderr;
    try {
      const result = await execPromise(command, {
        env: {
          ...process.env,
          PGPASSWORD: password
        }
      });
      stdout = result.stdout;
      stderr = result.stderr;
    } catch (execError: any) {
      if (execError.message.includes('not recognized') || execError.message.includes('not found')) {
        throw new Error("pg_dump is not installed or not in PATH. Please install PostgreSQL Client Tools on the host server.");
      }
      throw execError;
    }

    if (stderr && !stderr.includes('pg_dump: warning:')) {
      // pg_dump outputs warnings to stderr sometimes, but real errors too
      console.warn('pg_dump stderr:', stderr);
    }

    // Verify file was created
    if (!fs.existsSync(outputPath)) {
      throw new Error("Backup file was not created successfully.");
    }
    
    const stats = fs.statSync(outputPath);
    const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

    return {
      success: true,
      message: `Database dumped successfully to ${filename}`,
      file: filename,
      path: outputPath,
      size: `${sizeInMB} MB`,
      timestamp: new Date().toISOString()
    };

  } catch (error: any) {
    console.error('Database backup failed:', error);
    return {
      success: false,
      error: error.message || 'Unknown backup failure'
    };
  }
};
