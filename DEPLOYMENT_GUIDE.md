# Complete Deployment Guide — Nexus SOC Platform
### From Local Development → Full Live Production

---

## OVERVIEW: What You Have & What You Need

**You have now on your laptop:**
- `monitoring/dashboard` → The visual website (Next.js)
- `monitoring/ai-analyzer` → The AI backend (Node.js)
- `monitoring/prometheus` → Metrics database (config only)

**You need:**
- 1 "Main Server" (VPS) to host your dashboard & backend
- Node Exporter + Promtail on every other VPS you want to monitor

---

# PART 1 — SET UP YOUR MAIN SERVER
*This is the server where your Dashboard and Backend will live. Do this on ONE server only.*

---

## STEP 1 — Get a Linux VPS
Buy or use any Linux server (Ubuntu 22.04 recommended). You need:
- Minimum: 1 CPU, 1GB RAM, 20GB Disk
- A public IP address

---

## STEP 2 — Connect to the Main Server
On your Windows laptop, open PowerShell and type:
```bash
ssh root@YOUR_MAIN_SERVER_IP
```
**What this does:** Opens a remote terminal into your server. Every command you type now runs on that server, not your laptop.

---

## STEP 3 — Install Node.js (runs your backend and dashboard)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```
**What this does:** Downloads and installs Node.js version 20. This is the engine that powers both your `ai-analyzer` backend and your Next.js dashboard.

Verify it worked:
```bash
node --version
# Should print: v20.x.x
```

---

## STEP 4 — Install PM2 (keeps your apps running 24/7)
```bash
npm install -g pm2
```
**What this does:** Installs PM2, a process manager. When you close your terminal, PM2 keeps your apps running in the background automatically. It also restarts them if they crash.

---

## STEP 5 — Install PostgreSQL Client Tools (needed for database backups)
```bash
sudo apt install postgresql-client -y
```
**What this does:** Installs the `pg_dump` command-line tool so your backend can create real `.dump` database backups. This does NOT install a full database server — just the backup tools.

---

## STEP 6 — Install Redis (Required for Asynchronous Actions)
```bash
sudo apt install redis-server -y
sudo systemctl enable redis-server
sudo systemctl start redis-server
```
**What this does:** Installs Redis, which stores the "Job Queue" for the SOC. This allows the backend to handle long-running tasks like backups and AI remediation without slowing down the dashboard.

Verify it is running:
```bash
redis-cli ping
# Should print: PONG
```

---

## STEP 7 — Install Git and Clone the Project
```bash
sudo apt install git -y
git clone https://github.com/Animesh-singha/project-M.git
cd project-M
```
**What this does:** Downloads your complete project code from GitHub onto the server into a folder called `project-M`.

---

## STEP 7 — Configure the Backend (.env file)
```bash
cd ai-analyzer
cp .env .env.backup
nano .env
```
**What this does:** Opens your environment config file. Change the following values:
- `DB_HOST` → Your PostgreSQL server IP (already `100.97.103.94`)
- `JWT_SECRET` → A long random string (REQUIRED for session security)
- `SEED_USER` / `SEED_PASS` → Your initial admin credentials
- `AI_PROVIDER_API_KEY` → Your Gemini API Key
- `REDIS_HOST` → `localhost` (if you installed it in Step 6)
- `REDIS_PORT` → `6379`
- `NOTIFY_EMAIL` → Your email for alerts

Press `Ctrl + X`, then `Y`, then `Enter` to save.

---

## STEP 8 — Install Backend Dependencies and Build
```bash
npm install
npm run build
```
**What this does:**
- `npm install` → Downloads all Node.js packages your backend needs
- `npm run build` → Compiles your TypeScript code into optimised JavaScript

---

## STEP 9 — Start the Backend with PM2
```bash
pm2 start dist/index.js --name nexus-backend
pm2 save
pm2 startup
```
**What this does:**
- Starts the ai-analyzer backend permanently under PM2
- `pm2 save` → Remembers this app after server reboot
- `pm2 startup` → Prints a command, copy and run that command to make PM2 auto-start on reboot

Verify it is running:
```bash
pm2 list
# You should see: nexus-backend | online
```

---

## STEP 10 — Configure and Start the Dashboard
```bash
cd ../dashboard
npm install
```
Create the environment file:
```bash
echo "NEXT_PUBLIC_API_URL=http://YOUR_MAIN_SERVER_IP:3001" > .env.local
```
> ⚠️ Replace `YOUR_MAIN_SERVER_IP` with the actual IP of this server.

Build and start:
```bash
npm run build
pm2 start "npm run start" --name nexus-dashboard
pm2 save
```
**What this does:** Builds the dashboard for production and starts it permanently under PM2 on port 3000.

---

## STEP 11 — Open Firewall Ports
```bash
sudo ufw allow 22      # SSH (so you can still connect)
sudo ufw allow 3000    # Dashboard
sudo ufw allow 3001    # AI Backend
sudo ufw allow 9090    # Prometheus (internal)
sudo ufw allow 3100    # Loki (internal)
sudo ufw enable
```
**What this does:** Opens the necessary ports on your server's firewall so your browser can reach the dashboard.

### 🛡️ Production Security Checklist (CRITICAL)
1. **Change SEED_PASS**: Ensure your seed admin password is set to a secure unique string.
2. **Rotate JWT_SECRET**: Use a 64+ character string for production.
3. **Redis Security**: If using Redis, ensure it is binded to localhost or protected by a strong password.
4. **Agent Transition**: For high-security environments, prepare to transition from direct SSH to the **Nexus Agent** (Coming in Phase 5).

---

## STEP 12 — Install Prometheus (collects metrics from all servers)
```bash
cd /tmp
wget https://github.com/prometheus/prometheus/releases/download/v2.49.0/prometheus-2.49.0.linux-amd64.tar.gz
tar xvfz prometheus-2.49.0.linux-amd64.tar.gz
sudo mv prometheus-2.49.0.linux-amd64/prometheus /usr/local/bin/
sudo mv prometheus-2.49.0.linux-amd64/promtool /usr/local/bin/
```
**What this does:** Installs Prometheus — the database that every 15 seconds reaches out to all your VPS servers and collects their CPU/RAM numbers.

Create Prometheus config:
```bash
sudo mkdir -p /etc/prometheus
sudo tee /etc/prometheus/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'nexus_fleet'
    static_configs:
      - targets: []   # You will add your VPS IPs here in Part 2
EOF
```

Create Prometheus as a service:
```bash
sudo tee /etc/systemd/system/prometheus.service << 'EOF'
[Unit]
Description=Prometheus
After=network.target

[Service]
User=root
ExecStart=/usr/local/bin/prometheus --config.file=/etc/prometheus/prometheus.yml --storage.tsdb.path=/var/lib/prometheus
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable prometheus
sudo systemctl start prometheus
```

---

## STEP 13 — Install Loki (stores logs from all servers)
```bash
cd /tmp
wget https://github.com/grafana/loki/releases/download/v2.9.0/loki-linux-amd64.zip
sudo apt install unzip -y
unzip loki-linux-amd64.zip
sudo mv loki-linux-amd64 /usr/local/bin/loki
```

Create Loki config:
```bash
sudo tee /etc/loki-config.yaml << 'EOF'
auth_enabled: false
server:
  http_listen_port: 3100
ingester:
  lifecycler:
    ring:
      kvstore:
        store: inmemory
      replication_factor: 1
schema_config:
  configs:
    - from: 2020-10-24
      store: boltdb-shipper
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 24h
storage_config:
  boltdb_shipper:
    active_index_directory: /tmp/loki/boltdb-shipper-active
    cache_location: /tmp/loki/boltdb-shipper-cache
  filesystem:
    directory: /tmp/loki/chunks
EOF
```

Start Loki:
```bash
pm2 start "loki -config.file=/etc/loki-config.yaml" --name nexus-loki
pm2 save
```

---

## STEP 14 — TEST: Open Your Dashboard
Open your browser on your laptop and visit:
```
http://YOUR_MAIN_SERVER_IP:3000
```
You should see the Nexus SOC login screen. Login works because the backend talks to your PostgreSQL database. ✅

**Your main server is now fully set up.**

---
---

# PART 2 — SET UP MONITORING ON EACH TARGET VPS
*Repeat ALL steps in this section on every VPS/VDS you want to monitor.*
*SSH into each target VPS before starting.*

---

## STEP 15 — Connect to a Target VPS
On your laptop:
```bash
ssh root@YOUR_TARGET_VPS_IP
```

---

## STEP 16 — Install Node Exporter (streams CPU, RAM, Disk data)
```bash
cd /tmp
wget https://github.com/prometheus/node_exporter/releases/download/v1.7.0/node_exporter-1.7.0.linux-amd64.tar.gz
tar xvfz node_exporter-1.7.0.linux-amd64.tar.gz
sudo mv node_exporter-1.7.0.linux-amd64/node_exporter /usr/local/bin/
```

Create the service:
```bash
sudo tee /etc/systemd/system/node_exporter.service << 'EOF'
[Unit]
Description=Node Exporter
After=network.target

[Service]
User=root
ExecStart=/usr/local/bin/node_exporter
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable node_exporter
sudo systemctl start node_exporter
```

Verify it works:
```bash
curl http://localhost:9100/metrics | head -5
```
**You should see real data like:** `node_cpu_seconds_total`, `node_memory_MemAvailable_bytes`

---

## STEP 17 — Lock the Metrics Port (Security)
```bash
sudo ufw deny 9100
sudo ufw allow from YOUR_MAIN_SERVER_IP to any port 9100
sudo ufw reload
```
**What this does:** Hides port 9100 from hackers. Only your main dashboard server can see it.

> ⚠️ Replace `YOUR_MAIN_SERVER_IP` with your Part 1 server's IP.

---

## STEP 18 — Install Promtail (streams Nginx and app logs)
```bash
cd /tmp
wget https://github.com/grafana/loki/releases/download/v2.9.0/promtail-linux-amd64.zip
unzip promtail-linux-amd64.zip
sudo mv promtail-linux-amd64 /usr/local/bin/promtail
```

Create config:
```bash
sudo tee /etc/promtail-config.yaml << EOF
server:
  http_listen_port: 9080
positions:
  filename: /tmp/positions.yaml
clients:
  - url: http://YOUR_MAIN_SERVER_IP:3100/loki/api/v1/push
scrape_configs:
  - job_name: nginx
    static_configs:
      - targets: [localhost]
        labels:
          vps: "$(hostname)"
          __path__: /var/log/nginx/*.log
EOF
```
> ⚠️ Replace `YOUR_MAIN_SERVER_IP` with your Part 1 server's IP.

Start Promtail:
```bash
sudo tee /etc/systemd/system/promtail.service << 'EOF'
[Unit]
Description=Promtail
After=network.target

[Service]
User=root
ExecStart=/usr/local/bin/promtail -config.file=/etc/promtail-config.yaml
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable promtail
sudo systemctl start promtail
```
**What this does:** Promtail now reads your Nginx log files and streams them to Loki on your main server in real-time. Your dashboard Live Logs section will show real logs.

---

## STEP 19 — Register This VPS in Prometheus
**Go back to your main server** (SSH into it again):
```bash
ssh root@YOUR_MAIN_SERVER_IP
nano /etc/prometheus/prometheus.yml
```

Add this VPS's IP to the targets list:
```yaml
scrape_configs:
  - job_name: 'nexus_fleet'
    static_configs:
      - targets:
          - '101.99.22.11:9100'   # ← Add the target VPS IP here
```

Save the file and restart Prometheus:
```bash
sudo systemctl restart prometheus
```
**What this does:** Prometheus now knows to contact that VPS every 15 seconds to collect its CPU and RAM data. Your dashboard will immediately start showing real graphs for that server.

---

## STEP 20 — Repeat for Every Other VPS
Go back to **Step 15** and repeat Steps 15–19 for each additional VPS/VDS you want to monitor. Each time, just add the new IP to the Prometheus targets list in Step 19.

---

---

## STEP 21 — Deploy the Nexus Discovery Agent (Real-time Topology)
*Run these commands on every target VPS to enable the "X-Ray Vision" map in the dashboard.*

```bash
# 1. SSH into the Target VPS
ssh root@YOUR_TARGET_VPS_IP

# 2. Copy the agent folder from the main server or clone it
# (Assuming you already have the repo on the VPS from Step 7)
cd ~/project-M/agent

# 3. Install dependencies
npm install

# 4. Configure the agent
cp .env.example .env
nano .env
```
Update the following:
- `NEXUS_HUB_URL` → `http://YOUR_MAIN_SERVER_IP:3001`
- `NEXUS_AGENT_TOKEN` → Must match your `ai-analyzer` `.env` token.

```bash
# 5. Start the agent permanently
pm2 start index.js --name nexus-agent
pm2 save
```

**What this does:** The agent will now push your processes, ports, and domains to the dashboard every 60 seconds. You will see your server appear automatically in the **Topology** tab.

---

# FINAL CHECK — Everything Running

On your main server:
```bash
pm2 list
```
You should see:
```
┌────────────────────┬────────┬──────┐
│ Name               │ Status │ CPU  │
├────────────────────┼────────┼──────┤
│ nexus-backend      │ online │ 0.1% │
│ nexus-dashboard    │ online │ 0.2% │
│ nexus-loki         │ online │ 0.1% │
└────────────────────┴────────┴──────┘
```

On each target VPS:
```bash
systemctl status node_exporter
systemctl status promtail
```
Both should say: `Active: active (running)`

Open your browser:
```
http://YOUR_MAIN_SERVER_IP:3000
```

**Your Nexus SOC dashboard is now fully live with real data. 🎉**

---

*For questions or issues at any step, refer to the main DOCUMENTATION.md*
