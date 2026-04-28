import { getProcesses } from "./collectors/process.js";
import { getPorts } from "./collectors/ports.js";
import { getNginxConfig } from "./collectors/nginx.js";
import { getContainers } from "./collectors/docker.js";
import axios from "axios";
import dotenv from "dotenv";
import os from "os";

dotenv.config();

const API_URL = process.env.NEXUS_HUB_URL || "http://localhost:3001";
const AGENT_TOKEN = process.env.NEXUS_AGENT_TOKEN || "nexus_secret_agent_token";
const INTERVAL = parseInt(process.env.COLLECTION_INTERVAL || "10000");

async function pushUpdate() {
  console.log(`[${new Date().toISOString()}] Starting discovery cycle...`);
  
  try {
    const isMock = process.env.NEXUS_MOCK_MODE === "true";
    const serverName = process.env.SERVER_NAME || os.hostname();

    const data = isMock ? {
      hostname: serverName,
      ip: "100.97.103." + (Math.floor(Math.random() * 254) + 1),
      timestamp: new Date().toISOString(),
      platform: "linux",
      release: "5.15.0-mock",
      metrics: {
        cpu: { load_avg: (Math.random() * 100).toFixed(1) },
        memory: { total_gb: 8, used_gb: (Math.random() * 7).toFixed(1) }
      },
      processes: [
        { name: "node", pid: 1001, user: "node", cpu: 1.2, mem: 120, command: "node server.js" },
        { name: "postgres", pid: 1002, user: "postgres", cpu: 0.5, mem: 512, command: "postgres -D /data" },
        { name: "redis", pid: 1003, user: "redis", cpu: 0.1, mem: 64, command: "redis-server" }
      ],
      network: [
        { localAddress: "0.0.0.0:3000", state: "LISTEN", program: "node" },
        { localAddress: "0.0.0.0:5432", state: "LISTEN", program: "postgres" }
      ],
      nginx: [
        { domain: `${serverName.toLowerCase()}.nexus.local`, proxy: "http://127.0.0.1:3000" }
      ],
      containers: [
        { id: "c1", image: "nexus-app:latest", status: "running", names: "app_container" }
      ]
    } : {
      hostname: os.hostname(),
      timestamp: new Date().toISOString(),
      platform: os.platform(),
      release: os.release(),
      processes: await getProcesses(),
      network: await getPorts(),
      nginx: getNginxConfig(),
      containers: await getContainers()
    };

    console.log(`[${new Date().toISOString()}] Collected ${data.processes.length} processes and ${data.nginx.length} nginx configs.`);

    const res = await axios.post(`${API_URL}/v1/agent/heartbeat`, data, {
      headers: { 
        "Authorization": `Bearer ${AGENT_TOKEN}`,
        "Content-Type": "application/json"
      }
    });

    if (res.status === 200) {
      console.log(`[${new Date().toISOString()}] Heartbeat synced successfully.`);
    }
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Heartbeat failed:`, err.message);
  }
}

// Start loop
console.log("Nexus Discovery Agent started.");
pushUpdate();
setInterval(pushUpdate, INTERVAL);
