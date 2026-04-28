import fs from "fs";
import path from "path";

export function getNginxConfig() {
  const sitesPath = "/etc/nginx/sites-enabled";
  
  if (!fs.existsSync(sitesPath)) {
    return [];
  }

  try {
    const files = fs.readdirSync(sitesPath);
    
    return files.map(file => {
      try {
        const fullPath = path.join(sitesPath, file);
        const content = fs.readFileSync(fullPath, "utf-8");
        
        // Extract server_name and proxy_pass (supporting both single and multiple values)
        const domainMatch = content.match(/server_name\s+([^;]+);/);
        const proxyMatch = content.match(/proxy_pass\s+([^;]+);/);

        return { 
          file,
          domain: domainMatch ? domainMatch[1].trim() : null, 
          proxy: proxyMatch ? proxyMatch[1].trim() : null 
        };
      } catch (e) {
        return { file, error: e.message };
      }
    });
  } catch (err) {
    console.error("Error reading Nginx configs:", err);
    return [];
  }
}
