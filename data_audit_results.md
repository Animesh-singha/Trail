# Nexus SOC Data Integrity Audit

## 1. Discovered Inconsistencies (Ground Truth vs. Render)

The project currently suffers from a "Split Reality" in its sandbox/demonstration data. Different components are pulling from different mock sources, leading to a fragmented user experience.

### 📊 Comparative Data Matrix

| Component | Source Type | Servers Shown | Sites Shown |
| :--- | :--- | :--- | :--- |
| **Main Dashboard** (Overview, Infra, Sites) | API Mock (`/api/metrics`) | `vps-lon-01`, `vps-nyc-02`, `vps-sg-03`, `vps-backup-04` | `demo-bank.io`, `security-vault.net`, `nexus-core-api.dev`, `global-cdn.com` |
| **Backup Panel** | Hardcoded Array | `vps-nyc-01`, `vps-lon-02` | `yoforex.com`, `backup_site.net`, `ai-analyzer-prod` |
| **Discovery Service** (Hub) | Database (`topology_nodes`) | EMPTY (pending agent heartbeat) | EMPTY |

### 🔍 Impact Analysis
*   **User Confusion**: A user might trigger a backup for `yoforex.com` but then find no mention of that site in the "Sites" or "Infrastructure" monitors.
*   **Verification Failure**: When testing "Production readiness," the disparate data sets make it impossible to verify end-to-end flows (e.g., seeing a health drop in the Overview tab after a backup fails).

## 2. Proposed "Single Source of Truth" Architecture

To resolve this, we will move all "Sandbox/Demo" data into the **AI Analyzer (Hub)** level, ensuring that if no real agents are connected, the Hub itself provides a consistent set of "Phantom Nodes" to all clients.

### Step 1: Centralize Simulation
Modify `ai-analyzer/src/services/visibility.service.ts` to return the `mockServers` and `mockWebsites` if the database is empty.

### Step 2: Refactor BackupPanel
Update `dashboard/components/BackupPanel.tsx` to fetch its server/site list from the `/v1/visibility/topology` API instead of using a local hardcoded array.

### Step 3: Remove Fragmented Mocks
Clean up `dashboard/app/api/metrics/route.ts` so it simply proxies to the Hub's topology, ensuring synchronization.

## 3. Verification Plan
- [ ] Use browser subagent to confirm `BackupPanel` currently shows `vps-nyc-01`.
- [ ] Confirm `Sites` tab shows `demo-bank.io`.
- [ ] Apply the synchronization fix.
- [ ] Verify both views now show the **exact same** server fleet.
