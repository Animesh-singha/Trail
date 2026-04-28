import { exec } from "child_process";

export function getContainers() {
  return new Promise((resolve) => {
    // Collect container ID, image, name, status, and ports
    const format = '{"id":"{{.ID}}", "image":"{{.Image}}", "name":"{{.Names}}", "status":"{{.Status}}", "ports":"{{.Ports}}"}';
    exec(`docker ps --format '${format}'`, (err, stdout) => {
      if (err) return resolve([]);
      
      const lines = stdout.trim().split("\n").filter(l => l.length > 0);
      const containers = lines.map(line => {
        try {
          return JSON.parse(line);
        } catch (e) {
          return null;
        }
      }).filter(c => c !== null);
      
      resolve(containers);
    });
  });
}
