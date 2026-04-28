import { exec } from "child_process";

export function getPorts() {
  return new Promise((resolve) => {
    // ss -tulnp is faster and more modern than netstat
    exec("ss -tulnp", (err, stdout) => {
      if (err) return resolve("");
      resolve(stdout);
    });
  });
}
