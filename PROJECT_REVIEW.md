# Nexus SOC Dashboard: Complete Project Review

This document provides an exhaustive review of the Nexus SOC project, detailing every component, its purpose, and how it functions.

---

## 🏗️ 1. Holistic Architecture

Nexus is an **Autonomous Security Operations Center (SOC)**. It doesn't just monitor servers; it uses AI to understand what's wrong and suggest how to fix it.

### The Flow:
1.  **Monitoring Stack** (Prometheus/Blackbox) detects a failure.
2.  **Alertmanager** sends a webhook notification to the **AI Analyzer**.
3.  **EventHub (EventEmitter)** broadcasts the incident internally.
4.  **WebSockets** push the alert to the **Dashboard** instantly (zero polling).
5.  **Google Gemini AI** analyzes logs and suggest fixes.
6.  **Human-in-the-Loop**: Admin reviews and triggers remediation via the dashboard.

---

## 🏗️ 2. Detailed Component Matrix (Implemented vs. Planned)

The following table breaks down every critical function of the Nexus SOC and its current development status.

### 🤖 Backend (`ai-analyzer`)
| Component | Function | Status |
| :--- | :--- | :--- |
| **Auth & Session** | JWT Access Tokens & HttpOnly Refresh Cookies | ✅ Implemented |
| **Auth & Session** | Granular RBAC (11+ Permissions) | ✅ Implemented |
| **Simulation** | **Decision Simulator (Impact Engine)** | ✅ Implemented |
| **Automation** | BullMQ Asynchronous Execution Pipeline | ✅ Implemented |
| **Automation** | Database Backup & Restore logic | ✅ Implemented |
| **Incidents** | Gemini AI Root Cause Analysis | ✅ Implemented |
| **Incidents** | Manual Approval & Remediation Flow | ✅ Implemented |
| **Events** | WebSocket Real-time Broadcasting Hub | ✅ Implemented |
| **Auditing** | Forensics-ready Audit Logs (IP, Trace, Duration) | ✅ Implemented |
| **Infrastructure** | **Application Discovery (Processes & Ports)** | ✅ Implemented |
| **Infrastructure** | **Domain & Routing Mapping (Nginx)** | ✅ Implemented |
| **Infrastructure** | **Nexus Discovery Agent (Push-based)** | ✅ Implemented |
| **Infrastructure** | Multi-region Hub-and-Spoke Clustering | 🚧 Planned (Phase 5) |

### 📂 Frontend (`dashboard`)
| Component | Function | Status |
| :--- | :--- | :--- |
| **Incident Center** | Real-time Incident Feed & Severity Cards | ✅ Implemented |
| **Incident Center** | Decision Intelligence Preview Modal | ✅ Implemented |
| **Incident Center** | Root Cause Storyboard (Timeline) | ✅ Implemented |
| **Terminal** | Live Log Streamer & Command Simulator | ✅ Implemented |
| **Infrastructure** | Server Health & Resource Metric Graphs | ✅ Implemented |
| **Intelligence** | **Business Service Mapping (Grouping)** | ✅ Implemented |
| **Intelligence** | **Incident-Topology Linking (Impact Paths)**| ✅ Implemented |
| **Intelligence** | **Timeline Replay (Topology Snapshots)** | ✅ Implemented |
| **Infrastructure** | **Dynamic Topology Map (Visual Linkage)** | ✅ Implemented |
| **Tools** | Interactive Command Palette (Quick Actions) | ✅ Implemented |
| **Security** | Retro-styled Secure Gateway (Auth Terminal) | ✅ Implemented |
| **Management** | **Agent Management & Discovery UI** | ✅ Implemented |

### 🗄️ Database (`PostgreSQL`)
| Component | Function | Status |
| :--- | :--- | :--- |
| **Schema** | `incidents` Table (Storage & RCA) | ✅ Implemented |
| **Schema** | `audit_logs` Table (Forensics & Tracing) | ✅ Implemented |
| **Schema** | `users` Table (RBAC & Auth) | ✅ Implemented |
| **Logic** | Connection Pooling (`pg` pool) | ✅ Implemented |
| **Recovery** | **Automated Database Backup (`pg_dump`)** | ✅ Implemented |
| **Lifecycle** | **Data Archiving & Partitioning (Retention)** | 🚧 Planned (Phase 5) |
| **Analytics** | Materialised Views for Real-time Dashboards | 🚧 Planned (Phase 5) |

## 💻 3. Module Deep-Dive

### 📂 `dashboard/` (SRE Command Center)
-   **Live Logs**: Uses WebSockets to stream real-time events from the backend `eventHub`.
-   **Decision Intelligence**: Calls the `/simulate` endpoint to show an "Impact Preview" card before any command execution.
-   **Responsive Design**: Optimized for 16:9 4K SOC displays and mobile emergency access.

### 🤖 `ai-analyzer/` (Operational Intelligence)
-   **Simulation Service**: Rules-based engine that calculates risk scores and models downtime based on historical `audit_logs`.
-   **Queue Service**: Uses `BullMQ` (Redis-backed) to ensure long-running tasks (backups/remediations).
-   **Service Service**: Manages the logical grouping of infrastructure nodes into business units.
-   **Visibility Service**: Enhanced with graph query filtering and incident-to-node linking logic.
-   **Security Service**: Enforces `requirePermission` middleware on all administrative routes.
-   **Discovery Service**: The correlation engine that links Nginx domains to local process PIDs.

### 📂 `agent/` (The Pulse)
-   **Collectors**: Individual scripts for `process`, `port`, and `nginx` discovery.
-   **Heartbeat**: Pushes real-time system state to the Hub every 60 seconds via secure token.

---

## 🛠️ 4. Maintenance & Roadmap

- **[COMPLETED] Phase 1-4**: Security, WebSockets, Safety Layer, Decision Intelligence, **Visibility & Discovery**.
- **[NEXT] Phase 5: Endpoint Intelligence**: Correlating API performance and latency directly into the relationship graph.

---
*Last Technical Review: March 19, 2026*
*Status: Production Hardening 2.0 Complete*
