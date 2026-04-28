import fs from 'fs';
import path from 'path';

export const getFileIntegrityLogs = async (): Promise<any[]> => {
  try {
    const rootDir = process.cwd();
    const ignoreDirs = ['node_modules', '.next', 'dist', '.git', 'backups', 'logs'];
    
    const scanDir = (dir: string, fileList: any[] = []) => {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        if (ignoreDirs.includes(file)) continue;
        
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isDirectory()) {
          // Limit depth to prevent performance issues in large repos
          const depth = (filePath.split(path.sep).length - rootDir.split(path.sep).length);
          if (depth < 3) scanDir(filePath, fileList);
        } else {
          fileList.push({
            file: path.relative(rootDir, filePath),
            modified_at: stats.mtime.toISOString(),
            size: (stats.size / 1024).toFixed(2) + ' KB',
            type: path.extname(file).replace('.', '') || 'file'
          });
        }
      }
      return fileList;
    };

    const allFiles = scanDir(rootDir);
    
    // Sort by modification time and take top 15
    return allFiles
      .sort((a, b) => new Date(b.modified_at).getTime() - new Date(a.modified_at).getTime())
      .slice(0, 15);
      
  } catch (err) {
    console.error('File Integrity scan failed:', err);
    return [];
  }
};
