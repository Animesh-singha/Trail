import { query } from "./db.service";
import { getSystemTopology } from "./visibility.service";
import { eventHub } from "../utils/events";

interface AgentPayload {
  hostname: string;
  ip?: string;
  timestamp: string;
  metrics?: {
    cpu: { load_avg: number };
    memory: { total_gb: number; used_gb: number };
  };
  processes: any[];
  network: string;
  nginx: any[];
  containers?: any[];
}

export class DiscoveryService {
  /**
   * Processes a heartbeat from a VPS agent
   */
  static async processHeartbeat(payload: AgentPayload) {
    const { hostname, ip, metrics, processes, network, nginx, containers = [] } = payload;
    const serverNodeId = `server:${hostname}`;

    console.log(`[Discovery] Processing heartbeat for ${hostname}`);

    // 0. Run Cleanup
    await this.runCleanup();

    // 1. Create/Update the Server Node with rich metadata
    await this.upsertNode({
      id: serverNodeId,
      name: hostname,
      type: 'SERVER',
      status: 'online',
      metadata: { 
        ip: ip || '0.0.0.0',
        cpu: metrics?.cpu || { load_avg: 0 },
        memory: metrics?.memory || { total_gb: 0, used_gb: 0 },
        last_seen: new Date().toISOString() 
      }
    });

    // 2. Clear old edges for this server
    await query('DELETE FROM topology_edges WHERE source_id = $1 OR target_id = $1', [serverNodeId]);

    // 3. Process Nginx Maps
    for (const site of nginx) {
      if (!site.domain) continue;

      const domainNodeId = `domain:${site.domain}`;
      
      await this.upsertNode({
        id: domainNodeId,
        name: site.domain,
        type: 'DOMAIN',
        status: 'online',
        metadata: { config_file: site.file, server: hostname }
      });

      await this.createEdge(domainNodeId, serverNodeId, 'serves', {}, 'config');

      // 4. Correlate Domain to App via Port
      if (site.proxy) {
        const portMatch = site.proxy.match(/:(\d+)/);
        if (portMatch) {
          const port = portMatch[1];
          const appNodeId = `app:${hostname}:${port}`;
          const appName = this.findAppNameByPort(port, network, processes);

          await this.upsertNode({
            id: appNodeId,
            name: appName || `App on :${port}`,
            type: 'APP',
            status: 'online',
            metadata: { port, server: hostname }
          });

          await this.createEdge(serverNodeId, appNodeId, 'runs_on', {}, 'observed');
          await this.createEdge(domainNodeId, appNodeId, 'serves', { proxy_pass: site.proxy }, 'config');
        }
      }
    }

    // 5. Process Docker Containers
    for (const container of containers) {
      const containerNodeId = `container:${hostname}:${container.id}`;
      
      await this.upsertNode({
        id: containerNodeId,
        name: container.name,
        type: 'APP',
        status: container.status.includes('Up') ? 'online' : 'error',
        metadata: { 
          container_id: container.id, 
          image: container.image, 
          status: container.status,
          ports: container.ports 
        }
      });

      await this.createEdge(serverNodeId, containerNodeId, 'runs_on', {}, 'observed');
    }

    // 6. Capture a snapshot
    await this.captureAdaptiveSnapshot();

    // 7. Broadcast update for UI sync
    const topology = await getSystemTopology();
    eventHub.emit('broadcast', { type: 'TOPOLOGY_UPDATED', payload: topology });
  }

  private static async captureAdaptiveSnapshot() {
    const DIFF_PERCENT_LIMIT = parseFloat(process.env.NEXUS_DIFF_PERCENT_LIMIT || '0.4');
    const DIFF_NODES_LIMIT = parseInt(process.env.NEXUS_DIFF_NODES_LIMIT || '50');
    const MAX_FRAG_NODES = parseInt(process.env.NEXUS_MAX_FRAG_NODES || '200');

    try {
      const currentTopology = await getSystemTopology();
      const lastSnapshotRes = await query('SELECT snapshot_data FROM topology_snapshots ORDER BY timestamp DESC LIMIT 1');
      const lastSnapshot = lastSnapshotRes.rows[0]?.snapshot_data;

      let shouldCaptureFull = true;
      if (lastSnapshot) {
        const diffAbsolute = Math.abs(currentTopology.nodes.length - lastSnapshot.nodes.length) + 
                             Math.abs(currentTopology.edges.length - lastSnapshot.edges.length);
        const diffPercent = diffAbsolute / (lastSnapshot.nodes.length + lastSnapshot.edges.length || 1);

        const timeSinceLastRes = await query("SELECT EXTRACT(EPOCH FROM (NOW() - timestamp)) / 3600 as hours_ago FROM topology_snapshots ORDER BY timestamp DESC LIMIT 1");
        const hoursAgo = timeSinceLastRes.rows[0]?.hours_ago || 99;

        if (diffAbsolute > MAX_FRAG_NODES) {
          shouldCaptureFull = true;
        } else if (diffPercent < DIFF_PERCENT_LIMIT && diffAbsolute < DIFF_NODES_LIMIT && hoursAgo < 1) {
          shouldCaptureFull = false;
        }
      }

      if (shouldCaptureFull) {
        await query(
          'INSERT INTO topology_snapshots (snapshot_data, metadata) VALUES ($1, $2)',
          [JSON.stringify(currentTopology), JSON.stringify({ type: 'FULL' })]
        );
      }
    } catch (err) {
      console.error('[Discovery] Snapshot failed:', err);
    }
  }

  private static async upsertNode(node: { id: string, name: string, type: string, status: string, metadata: any }) {
    const sql = `
      INSERT INTO topology_nodes (id, name, type, status, metadata, last_seen)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        type = EXCLUDED.type,
        status = EXCLUDED.status,
        metadata = topology_nodes.metadata || EXCLUDED.metadata,
        last_seen = NOW();
    `;
    return query(sql, [node.id, node.name, node.type, node.status, JSON.stringify(node.metadata)]);
  }

  private static async runCleanup() {
    try {
      await query("DELETE FROM topology_nodes WHERE last_seen < NOW() - INTERVAL '10 minutes' AND id NOT LIKE 'user-%'");
    } catch (err) {
      console.error('[Discovery] Cleanup failed:', err);
    }
  }

  private static async createEdge(sourceId: string, targetId: string, type: string, metadata: any = {}, edgeSource: string = 'observed') {
    const confidenceMap: Record<string, number> = { 'observed': 0.9, 'config': 1.0, 'inferred': 0.5 };
    const baseConfidence = confidenceMap[edgeSource] || 0.5;

    const existing = await query(
      'SELECT metadata FROM topology_edges WHERE source_id = $1 AND target_id = $2 AND source = $3',
      [sourceId, targetId, edgeSource]
    );

    const frequency = existing.rows.length > 0 ? (existing.rows[0].metadata?.frequency || 0) + 1 : 1;
    const fMax = 100;
    const frequencyScore = Math.log(1 + frequency) / Math.log(1 + fMax);
    const finalScore = Math.min(1.0, (baseConfidence * 0.7) + (frequencyScore * 0.3));

    const sql = `
      INSERT INTO topology_edges (source_id, target_id, type, metadata, confidence, source, last_verified)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT DO UPDATE SET
        confidence = EXCLUDED.confidence,
        metadata = topology_edges.metadata || jsonb_build_object('frequency', $7::int),
        last_verified = NOW();
    `;
    return query(sql, [sourceId, targetId, type, JSON.stringify(metadata), finalScore, edgeSource, frequency]);
  }

  private static findAppNameByPort(port: string, network: string, processes: any[]): string | null {
    const regex = new RegExp(`:${port}.*?pid=(\\d+)`, 's');
    const match = network.match(regex);
    if (match) {
      const pid = match[1];
      const proc = processes.find(p => p.pid === pid);
      if (proc) return proc.name;
    }
    return null;
  }
}
