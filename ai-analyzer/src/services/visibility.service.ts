import { pool, query } from './db.service';
import { getEndpointStats } from '../utils/performance';

export interface TopologyNode {
  id: string;
  name: string; // Changed from label for consistency
  type: 'SERVER' | 'APP' | 'DB' | 'DOMAIN';
  status: 'online' | 'warning' | 'error';
  metadata?: Record<string, any>;
}

export interface TopologyEdge {
  from: string;
  to: string;
  type: string;
  metadata?: Record<string, any>;
}

export interface SystemTopology {
  nodes: any[];
  edges: any[];
}

export interface TopologyFilters {
  type?: string;
  status?: string;
  server?: string;
}

export const getSystemTopology = async (filters: TopologyFilters = {}): Promise<SystemTopology> => {
  try {
    let nodesQuery = 'SELECT * FROM topology_nodes WHERE 1=1';
    const params: any[] = [];
    
    if (filters.type) {
      params.push(filters.type.toUpperCase());
      nodesQuery += ` AND type = $${params.length}`;
    }
    
    if (filters.status) {
      params.push(filters.status);
      nodesQuery += ` AND status = $${params.length}`;
    }

    const nodesRes = await pool.query(nodesQuery, params);
    const edgesRes = await pool.query('SELECT * FROM topology_edges');
    
    // 2. Fetch Active Incidents to link them
    const incidentsRes = await pool.query("SELECT id, service FROM incidents WHERE status = 'OPEN'");
    const activeIncidents = incidentsRes.rows;

    // Map edges to frontend format (from/to)
    const edges = edgesRes.rows.map(edge => ({
      from: edge.source_id,
      to: edge.target_id,
      type: edge.type,
      label: edge.metadata?.proxy_pass || edge.type
    }));

    // 3. Enrich nodes with incident (and performance) data
    const nodes = await Promise.all(nodesRes.rows.map(async node => {
      // Find incidents related to this node (matching by service name or host)
      const relatedIncidents = activeIncidents.filter(inc => 
        node.id.includes(inc.service) || node.name.includes(inc.service)
      );

      // Fetch Metrics 2.0 stats
      const stats = await getEndpointStats(node.id);

      return {
        ...node,
        label: node.name,
        status: relatedIncidents.length > 0 ? 'error' : node.status,
        metrics: {
          rps: parseFloat(stats?.rps || 0).toFixed(2),
          p95: Math.round(stats?.p95_latency || 0),
          error_percent: parseFloat(stats?.error_percent || 0).toFixed(1),
          total_requests: stats?.total_requests || 0
        },
        metadata: {
          ...node.metadata,
          active_incidents: relatedIncidents.map(i => i.id)
        }
      };
    }));

    // If no real data yet, return a mix of real data and basic entry points
    if (nodes.length === 0 && !filters.type && !filters.status) {
      nodes.push({ id: 'user-cloud', name: 'Public Internet', type: 'USER', status: 'online', label: 'Public Internet' });
    }

    return { nodes, edges };
  } catch (err) {
    console.error('Failed to fetch real topology:', err);
    throw err;
  }
};

export const getAppMetrics = async (server: string) => {
  try {
    const res = await pool.query(
      `SELECT * FROM topology_nodes WHERE id LIKE $1 AND type = 'APP'`,
      [`app:${server}:%`]
    );
    
    return res.rows.map(row => ({
      name: row.name,
      pid: row.metadata?.pid || 'N/A',
      user: row.metadata?.user || 'N/A',
      cpu: row.metadata?.cpu || '0.1%',
      mem: row.metadata?.mem || 'N/A',
      port: row.metadata?.port,
      status: row.status === 'online' ? 'active' : 'warning'
    }));
  } catch (err) {
    console.error('Failed to fetch app metrics:', err);
    return [];
  }
};
