# Nexus Autonomous SOC Module — Full Technical Documentation

> **Version:** 1.0.0 | **Status:** Active Development | **Author:** Animesh Singha

---

## 📖 Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Module Breakdown](#4-module-breakdown)
5. [Feature Deep-Dives](#5-feature-deep-dives)
6. [Data Flow Diagrams](#6-data-flow-diagrams)
7. [API Reference](#7-api-reference)
8. [Production Deployment Guide](#8-production-deployment-guide)
9. [Configuration Reference (.env)](#9-configuration-reference)
10. [Roadmap](#10-roadmap)

---

## 1. Project Overview

**Nexus** is a self-hosted, autonomous Security Operations Center (SOC) platform designed to monitor a fleet of VPS/VDS servers and websites in real-time. It uses Google's Gemini AI to automatically analyze incidents, determine root causes, and suggest or even auto-execute fixes — all from a single premium web dashboard.

**The core problem it solves:**
> You run multiple websites across multiple servers. When something breaks at 3 AM, you don't want to log into each server, dig through logs, and figure out what happened. Nexus does all of that for you automatically and sends you an alert with the root cause already analyzed.

**Current Mode:** Running locally with mock data. Production deployment requires configuration of real server endpoints (see Section 8).

---

## 2. System Architecture

The platform is built as a **Hub-and-Spoke** architecture:

```
┌─────────────────────────────────────────────────────┐
│                   YOUR LAPTOP / MAIN SERVER         │
│                                                     │
│  ┌──────────────┐     ┌──────────────────────────┐  │
│  │  Next.js     │────▶│  ai-analyzer (Fastify)   │  │
│  │  Dashboard   │◀────│  Node.js Backend         │  │
│  │  Port: 3000  │     │  Port: 3001              │  │
│  └──────────────┘     └──────────┬───────────────┘  │
│                                  │                  │
│                       ┌──────────▼───────────────┐  │
│                       │  PostgreSQL Database      │  │
│                       │  nexus_db @ 100.97.103.94│  │
│                       └──────────────────────────┘  │
└─────────────────────────┬───────────────────────────┘
                          │ (Reads metrics & logs)
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
   ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
   │  VPS-NYC-01 │ │  VPS-LON-02 │ │  VPS-SIN-03 │
   │  yoforex.com│ │  ai-analyzer│ │  [Future]   │
   │  Port: 9100 │ │  Port: 9100 │ │  Port: 9100 │
   └─────────────┘ └─────────────┘ └─────────────┘
   (Node Exporter   (Node Exporter   (Node Exporter
    + Promtail)      + Promtail)      + Promtail)
```

---

## 3. Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 14 (React) | Dashboard UI framework |
| **UI Styling** | Tailwind CSS | Utility-first styling |
| **Animations** | Framer Motion | Smooth transitions & micro-animations |
| **Icons** | Lucide React | Clean SVG icon set |
| **Backend** | Fastify (Node.js) | High-performance REST API server |
| **Language** | TypeScript | Type safety for both frontend & backend |
| **AI Engine** | Google Gemini 1.5 Pro | Root Cause Analysis & AI summaries |
| **Database** | PostgreSQL | Stores incident history & audit logs |
| **Metrics** | Prometheus | Stores time-series hardware metrics |
| **Logs** | Loki + Promtail | Stores and streams application/server logs |
| **Notifications** | Nodemailer / Discord Webhooks| Alerting pipelines |

---

## 4. Module Breakdown

The project is organized into three main directories:

### `dashboard/` — The Frontend
The Next.js application that runs the visual interface. It does NOT store any data — it only reads from the `ai-analyzer` backend and Prometheus.

```
dashboard/
├── app/
│   ├── page.tsx          ← Main dashboard UI (login + all tabs)
│   └── globals.css       ← Global CSS & Tailwind
├── components/
│   ├── BackupPanel.tsx   ← Per-website backup control panel
│   ├── ServerGrid.tsx    ← VPS server management cards
│   ├── SiteCard.tsx      ← Website health monitoring cards
│   ├── MetricGraph.tsx   ← CPU/RAM line graphs
│   ├── ErrorStream.tsx   ← Live error log terminal
│   ├── CommandPalette.tsx← Ctrl+K command overlay
│   ├── ChatWidget.tsx    ← Floating AI chat interface
│   ├── UptimeMonitor.tsx ← Uptime pill displays
│   ├── LiveLogsViewer.tsx← Per-website scrolling log viewer
│   ├── FleetOverview.tsx ← Top-level metric summary cards
│   ├── RootCauseTimeline.tsx ← Incident analysis timeline
│   ├── AlertTimeline.tsx ← Recent alerts list
│   └── InfrastructureTopology.tsx ← Network graph visualization
└── package.json
```

### `ai-analyzer/` — The Backend Brain
The Fastify Node.js server. This is the actual intelligence engine. It receives alerts, calls Gemini, saves incidents to Postgres, and exposes REST APIs to the frontend.

```
ai-analyzer/
├── src/
│   ├── index.ts           ← Server entry point
│   ├── routes/
│   │   ├── control.route.ts  ← Server control & backup endpoints
│   │   ├── incident.route.ts ← Incident CRUD operations
│   │   ├── webhook.route.ts  ← Receives alerts from Alertmanager
│   │   └── auth.route.ts     ← Login/logout authentication
│   └── services/
│       ├── ai.service.ts     ← Calls Google Gemini API
│       ├── db.service.ts     ← PostgreSQL queries
│       ├── incident.service.ts ← Core alert processing pipeline
│       ├── backup.service.ts ← pg_dump execution logic
│       ├── control.service.ts← SSH command execution
│       ├── notify.service.ts ← Email/Discord notification sender
│       ├── security.service.ts ← SIEM threat detection patterns
│       ├── automation.service.ts← Auto-remediation logic
│       └── correlation.service.ts ← Log + Metric context gathering
└── .env
```

### `prometheus/`, `alertmanager/`, `blackbox/` — Monitoring Core
Standard industry-standard monitoring tools configured to scrape your servers and trigger alerts.

---

## 5. Feature Deep-Dives

### 🔐 Secure Login Gateway
**What it does:** Provides a password-protected login screen before accessing the dashboard.

**How it works:**
1. User types their username and password.
2. The frontend sends a `POST /v1/auth/login` request to `ai-analyzer`.
3. The backend queries the PostgreSQL `users` table and compares the hashed password.
4. On success, a session is established and the dashboard unlocks.

**Files:** `app/page.tsx` (InteractiveAuth component), `routes/auth.route.ts`, `services/db.service.ts`

---

### 📊 Overview Tab — Command Center
**What it does:** Shows a real-time summary of your entire infrastructure including uptime of websites, total incident count, and live system health scores.

**How it works:**
1. On page load, the `FleetOverview` component calls `GET /api/metrics` (Next.js API route).
2. That API route calls the Prometheus HTTP endpoint to pull actual server metrics.
3. The `UptimeMonitor` calls `GET /v1/metrics/uptime` to check if each website is up.
4. All data refreshes every 30 seconds automatically.

**Data Source (Mock → Production):** Prometheus at `http://localhost:9090` → Set to your Prometheus server's IP in `.env`.

---

### 🖥️ Infrastructure Tab — VPS Server Grid
**What it does:** Displays each VPS server as an interactive card showing hostname, IP, OS, CPU usage, and an action menu.

**How it works:**
- Each `ServerGrid` card has a 3-dot menu with actions like **Restart Service**, **Run Diagnostics**, and **SSH into Server**.
- When you click an action, the frontend calls `POST /v1/control/execute` with the `{ target: "vps-hostname", action: "RESTART_NGINX" }` payload.
- The `control.service.ts` backend runs the appropriate SSH command on the target server.

**Files:** `components/ServerGrid.tsx`, `routes/control.route.ts`, `services/control.service.ts`

---

### 🌐 Web Assets Tab — Site Management & Backups
**What it does:** Shows every website hosted across your VPS fleet with live status. Also provides the **Backup Panel** for per-website database dumps.

#### Backup Panel Sub-Feature:
**What it does:** Creates a real PostgreSQL `.dump` backup file for any specific selected website independently.

**How it works step-by-step:**
1. The user opens the **Global Web Assets** tab.
2. The **Website Asset Backups** panel shows at the top.
3. User selects a **Target Server** (e.g., `VPS-NYC-01`) from the dropdown.
4. Website cards appear for all apps on that server (e.g., `yoforex.com`).
5. User clicks **"Trigger .dump"** on the specific website they want to back up.
6. Frontend sends: `POST http://localhost:3001/v1/control/backup` with body `{ "target": "nexus_db" }`.
7. The backend `backup.service.ts` runs: `pg_dump -h <host> -U <user> -F c -f nexus_db_<timestamp>.dump nexus_db`
8. Using the `PGPASSWORD` environment variable for secure credential passing (never exposed in the URL).
9. The `.dump` file is saved to `ai-analyzer/backups/` on the server.
10. The backend returns: `{ success: true, file: "nexus_db_...", size: "1.23 MB" }`.
11. The button turns **green** ✅ and displays the filename.

**Files:** `components/BackupPanel.tsx`, `routes/control.route.ts`, `services/backup.service.ts`

---

### 🚨 Incidents Tab — Autonomous Incident Management
**What it does:** Shows a list of all detected incidents with their severity, status, and AI-generated analysis.

**How it works:**
1. When Alertmanager fires an alert (e.g., "High CPU on VPS-NYC-01"), it sends a `POST` request to `http://your-ai-analyzer:3001/v1/webhook`.
2. `webhook.route.ts` receives the alert payload.
3. `incident.service.ts` orchestrates the analysis pipeline:
   - **Step 1:** Gathers context (recent Prometheus metrics + Loki logs for that server).
   - **Step 2:** Checks for known security threat patterns (SIEM).
   - **Step 3:** Sends the alert + context to **Google Gemini 1.5 Pro**.
   - **Step 4:** Gemini returns: `{ summary, root_cause, suggested_fix, confidence, severity }`.
   - **Step 5:** If `severity == CRITICAL` AND `confidence > 80%`, auto-remediation triggers.
   - **Step 6:** Saves a structured `Incident` record to PostgreSQL.
   - **Step 7:** Sends notifications (Email/Discord).
4. The dashboard polls `GET /v1/incidents` every 30 seconds and displays everything in real-time.

**Incident list features:**
- **Time Range Filter**: Use the top dropdown (Last 1 Hour / 5 minutes / 24 Hours / 7 Days) to filter incidents by time.
- **Click an Incident**: Opens a deep-dive modal with the full Root Cause Timeline and AI analysis.
- **Resolve Button**: Sends `PATCH /v1/incidents/:id/status` to mark the incident as resolved in PostgreSQL.
- **Export SLA Report**: Downloads all current incidents as a `.csv` file directly in your browser.

---

### ⚡ Command Palette (Ctrl+K)
**What it does:** A keyboard-driven command interface for executing infrastructure actions quickly without clicking around.

**How it works:**
1. Press `Ctrl+K` anywhere on the dashboard.
2. Type to search for an action (e.g., "Restart Nginx").
3. Press Enter to execute.
4. The frontend calls `POST /v1/control/execute` with the action payload.
5. A success or error popup appears with the backend's response.
6. Navigation commands (e.g., "Go to Incidents") switch tabs instantly without a network call.

---

### 📺 Live Errors Tab — Real-Time Log Terminal
**What it does:** Shows a scrolling terminal-style view of the most recent error logs from your infrastructure.

**How it works (Current - Mock):** Generates simulated error log lines via a `setInterval` loop in the browser.

**How it works (Production):** Replace mock data with a real WebSocket or SSE stream. The backend continuously calls Loki's HTTP API to fetch the latest logs and pushes them to the frontend.

**Run AI Diagnostic Button:**
- Scans all loaded incidents to find the most critical open one.
- Automatically opens that incident's deep-dive modal where you can click "Explain with Gemini AI".

---

## 6. Data Flow Diagrams

### Alert → Incident Pipeline

```
VPS Server (High CPU alert fires)
        │
        ▼
Alertmanager
        │  POST /v1/webhook
        ▼
ai-analyzer (Fastify)
        │
        ├──▶ Prometheus (fetch CPU metrics history)
        ├──▶ Loki (fetch last 200 log lines)
        │
        ├──▶ Security SIEM Check (local pattern matching)
        │
        ├──▶ Google Gemini AI
        │       Returns: { root_cause, suggested_fix, confidence }
        │
        ├──▶ PostgreSQL (save incident)
        │
        ├──▶ Email / Discord (notify admin)
        │
        ▼
Dashboard (polling /v1/incidents)
        │
        ▼
USER SEES: Red incident card with AI summary and suggested fix
```

---

## 7. API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/v1/auth/login` | Validate user credentials |
| `GET` | `/v1/incidents` | Fetch all incidents |
| `GET` | `/v1/incidents/:id` | Fetch a specific incident |
| `GET` | `/v1/incidents/:id/analyze` | Run Gemini AI analysis on an incident |
| `GET` | `/v1/incidents/:id/timeline` | Get the root cause event timeline |
| `PATCH` | `/v1/incidents/:id/status` | Update incident status (OPEN/RESOLVED) |
| `POST` | `/v1/webhook` | Receive alerts from Alertmanager |
| `POST` | `/v1/control/execute` | Execute a remote action on a server |
| `POST` | `/v1/control/backup` | Trigger a pg_dump database backup |
| `GET` | `/v1/control/history` | View past control action audit log |
| `GET` | `/v1/metrics/uptime` | Fetch website uptime statuses |

---

## 8. Production Deployment Guide

### Step 1: Choose Your "Watcher" Server
Deploy a single VPS (even a $5/month one) to host your `ai-analyzer` and `dashboard`. This is your central hub. All other servers will send data TO this one server.

### Step 2: Deploy the Project to the Watcher
```bash
# Clone the project on the server
git clone https://github.com/Animesh-singha/project-M.git
cd project-M

# Install dependencies
cd ai-analyzer && npm install
cd ../dashboard && npm install

# Configure environment files
cp ai-analyzer/.env.example ai-analyzer/.env
# Edit the .env with your real database credentials, Gemini API key, etc.

# Start the backend with PM2 (keeps it alive 24/7)
npm install -g pm2
pm2 start ai-analyzer/dist/index.js --name nexus-backend
pm2 start "npm run start" --name nexus-dashboard --cwd dashboard
```

### Step 3: Install Monitoring Agents on Each Target VPS
Run these commands on **every VPS** you want to monitor:

**a) Install Node Exporter (for CPU/RAM/Disk metrics):**
```bash
# Download Node Exporter
wget https://github.com/prometheus/node_exporter/releases/download/v1.7.0/node_exporter-1.7.0.linux-amd64.tar.gz
tar xvfz node_exporter-1.7.0.linux-amd64.tar.gz
sudo mv node_exporter-1.7.0.linux-amd64/node_exporter /usr/local/bin/

# Create a systemd service so it auto-starts on reboot
sudo tee /etc/systemd/system/node_exporter.service << EOF
[Unit]
Description=Node Exporter
[Service]
ExecStart=/usr/local/bin/node_exporter
[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now node_exporter
```

**b) Lock down the port with a firewall (CRITICAL for security):**
```bash
# Allow ONLY your Watcher server's IP to access the metrics port
sudo ufw deny 9100
sudo ufw allow from YOUR_WATCHER_SERVER_IP to any port 9100
sudo ufw reload
```

**c) Install Promtail (for streaming log files to Loki):**
```bash
# Download Promtail
wget https://github.com/grafana/loki/releases/download/v2.9.0/promtail-linux-amd64.zip
unzip promtail-linux-amd64.zip
sudo mv promtail-linux-amd64 /usr/local/bin/promtail

# Create config telling Promtail which log files to read
sudo tee /etc/promtail-config.yaml << EOF
server:
  http_listen_port: 9080
positions:
  filename: /tmp/positions.yaml
clients:
  - url: http://YOUR_WATCHER_SERVER_IP:3100/loki/api/v1/push
scrape_configs:
  - job_name: nginx
    static_configs:
      - targets: [localhost]
        labels:
          job: nginx
          __path__: /var/log/nginx/*.log
EOF

sudo promtail -config.file=/etc/promtail-config.yaml &
```

### Step 4: Tell the Watcher Where to Look (Prometheus Config)
Edit `prometheus/prometheus.yml` on your Watcher server:
```yaml
scrape_configs:
  - job_name: 'production_fleet'
    static_configs:
      - targets:
          - '101.99.22.11:9100'   # VPS-NYC-01
          - '105.88.22.12:9100'   # VPS-LON-02
          - '108.77.33.14:9100'   # VPS-SIN-03
```
Restart Prometheus after saving. Mock data disappears instantly. Real metrics stream in.

### Step 5: Configure Alertmanager
Point Alertmanager's webhook to your `ai-analyzer`:
```yaml
# alertmanager/alertmanager.yml
receivers:
  - name: 'nexus-ai'
    webhook_configs:
      - url: 'http://YOUR_AI_ANALYZER_IP:3001/v1/webhook'
```

---

## 9. Configuration Reference

### `ai-analyzer/.env`

| Key | Description | Example |
|-----|-------------|---------|
| `PORT` | Backend server port | `3001` |
| `AI_PROVIDER_API_KEY` | Google Gemini API Key | `AIzaSy...` |
| `AI_MODEL` | Gemini model version | `gemini-1.5-pro` |
| `DB_HOST` | PostgreSQL server IP | `100.97.103.94` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_USER` | PostgreSQL username | `nexus_user` |
| `DB_PASSWORD` | PostgreSQL password | `YoForex@101` |
| `DB_NAME` | PostgreSQL database name | `nexus_db` |
| `PROMETHEUS_URL` | Prometheus server URL | `http://localhost:9090` |
| `LOKI_URL` | Loki server URL | `http://localhost:3100` |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token for alerts | *(optional)* |
| `DISCORD_WEBHOOK_URL` | Discord webhook for alerts | *(optional)* |
| `SMTP_USER` | Gmail for email alerts | `you@gmail.com` |
| `NOTIFY_EMAIL` | Destination email for alerts | `admin@you.com` |

### `dashboard/.env.local`

| Key | Description | Example |
|-----|-------------|---------|
| `NEXT_PUBLIC_API_URL` | URL of the ai-analyzer backend | `http://localhost:3001` |

---

## 10. Roadmap

| Feature | Status | Priority |
|---------|--------|----------|
| Real pg_dump backup execution | ✅ Backend Complete | — |
| Per-website Backup Panel UI | ✅ Complete | — |
| Command Palette → Backend Execute | ✅ Complete | — |
| Time Range Incident Filtering | ✅ Complete | — |
| SLA Report CSV Export | ✅ Complete | — |
| AI Diagnostic Button | ✅ Complete | — |
| SSH-based Codebase Archive (Zip Webroot) | 🔜 Next | High |
| WebSocket Real-time Log Streaming | 🔜 Planned | High |
| Automatic Server Discovery via Cloud APIs | 🔜 Planned | Medium |
| Mobile-responsive improvements | 🔜 Planned | Medium |
| Role-based access control (Multi-user) | 🔜 Planned | Low |
| Grafana Integration | 🔜 Planned | Low |

---

*© 2026 Nexus Monitoring Systems • Animesh Singha • All Rights Reserved.*
