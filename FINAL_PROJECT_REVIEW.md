# NEXUS — Final Project Architect Review
**The Infrastructure Intelligence Platform**

Nexus has evolved from a standard monitoring tool into a world-class **Infrastructure Intelligence Platform**. It provides a "Digital Twin" of your entire production fleet, offering real-time visibility, historical drift tracking, and AI-assisted decision intelligence.

---

## 🏛️ 1. High-Level Architecture (The Hub-and-Spoke)
Nexus operates as a centralized **Hub** (`ai-analyzer` + `dashboard`) communicating with a lightweight **Pulse Agent** (`agent/`) deployed across your fleet.

- **Hub**: Aggregates heartbeats, correlates relationships, and serves the visual interface.
- **Agent**: Lightweight, push-based collector that scans processes, ports, containers, and Nginx configs.
- **Metrics/Logs**: Industry-standard integration with Prometheus (Metrics) and Loki (Logs).

---

## 🧠 2. The 5-Layer Intelligence Stack

### 🔹 Layer 1: Infrastructure (Bare Metal/VPS)
- **Monitoring**: Real-time CPU, RAM, Disk, and Network via Node Exporter.
- **Discovery**: Hostname, OS release, and platform detection.

### 🔹 Layer 2: Application (Processes & Services)
- **Scanning**: Automatic detection of running apps (Node, Python, Go, etc.) via PID-to-Port mapping.
- **Service Mapping**: Tracking of background workers, cron jobs, and systemd services.

### 🔹 Layer 3: Containerization (Docker)
- **Container Awareness**: Native discovery of Docker containers as first-class citizens in the topology.
- **Health State**: Real-time status tracking (Up/Down/Exited) for every container.

### 🔹 Layer 4: Routing & Gateway (Nginx)
- **Automatic Correlator**: Parses `/etc/nginx/sites-enabled` to link public domains to internal application ports.
- **Relationship Map**: Visualizes exactly how traffic flows from the Public Internet ➔ Domain ➔ Nginx ➔ App.

### 🔹 Layer 5: Endpoint Performance (Route-Level)
- **Performance Middleware**: Custom hooks capture latency and error frequency for every API route.
- **X-Ray Vision**: See which specific endpoint (e.g., `/api/v1/auth`) is failing without digging through logs.

---

## ⚡ 3. Operational Robustness

| Feature | Function | Status |
| :--- | :--- | :--- |
| **Decision Simulator** | Models action risk (Low-High) using historical audit logs. | ✅ Complete |
| **Topology History** | Drift tracking. Records ADDED, REMOVED, and CHANGED events. | ✅ Complete |
| **Graph Integrity** | Automated TTL cleanup of stale nodes (every 10 minutes). | ✅ Complete |
| **Audit Forensics** | Records every admin action with IP, TraceID, and Duration. | ✅ Complete |
| **Security Layer** | JWT-based Hub-and-Spoke auth with 11+ Granular Permissions. | ✅ Complete |

---

## 📂 4. Module Breakdown

### 🤖 `ai-analyzer/` (The Brain)
- **`DiscoveryService`**: The core graph engine for correlation and drift tracking.
- **`SimulationService`**: The safety layer for predicting operational impact.
- **`QueueService`**: Redis-backed BullMQ for async tasks (Backups/Remediations).

### 📺 `dashboard/` (Command Center)
- **Topology Map**: Dynamic React Flow graph of the infrastructure.
- **Incident Hub**: AI-summarized alerts with Gemini-powered suggestions.
- **Terminal UI**: Live log streaming and command execution simulators.

### 🛰️ `agent/` (The Pulse)
- **Push-only Design**: Zero inbound ports required on target servers (Security-first).
- **Multi-Collector**: Pluggable scripts for system stats, services, and containers.

---

## 🛠️ 5. Next Evolution (Future)
- **Phase 6**: Distributed tracing across microservices (Full Span Analysis).
- **Phase 7**: Predictive anomaly detection (Time-series forecasting).

---
*Technical Architect: Animesh Singha*
*Date: March 19, 2026*
*Platform Status: Production-Ready (Intelligence v2.0)*
