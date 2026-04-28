import { exec } from "child_process";

export function getProcesses() {
  return new Promise((resolve) => {
    // We use -eo pid,user,comm,args to get full command lines for app identification
    exec("ps -eo pid,user,comm,args", (err, stdout) => {
      if (err) return resolve([]);
      
      const lines = stdout.trim().split("\n").slice(1);
      const processes = lines.map(line => {
        const parts = line.trim().split(/\s+/);
        return {
          pid: parts[0],
          user: parts[1],
          name: parts[2],
          cmd: parts.slice(3).join(" ")
        };
      });
      resolve(processes);
    });
  });
}
