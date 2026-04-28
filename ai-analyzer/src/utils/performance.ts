import { FastifyInstance } from 'fastify';
import { query } from '../services/db.service';

export function setupPerformanceTracking(fastify: FastifyInstance) {
  fastify.addHook('onResponse', async (request, reply) => {
    const duration = Math.round(reply.elapsedTime); // Fastify provides this if enabled
    const route = request.routeOptions?.url || request.url;
    const method = request.method;
    const statusCode = reply.statusCode;

    // Use a background query to avoid blocking response
    try {
      const nodeId = process.env.HUB_NODE_ID || `app:${process.env.HOSTNAME || 'hub'}:3001`;
      const dateSuffix = new Date().toISOString().split('T')[0].replace(/-/g, '_');
      const tableName = `endpoint_metrics_${dateSuffix}`;

      // Concurrent write to main (for easy query) and partition (for elite retention)
      // In high scale, we'd only write to partition and use a VIEW for queries
      const sql = `INSERT INTO ${tableName} (node_id, route, method, status_code, duration_ms) VALUES ($1, $2, $3, $4, $5)`;
      
      await query(sql, [nodeId, route, method, statusCode, duration]);
      
      // Also update the main table (if we want to keep it simple for now)
      await query(
        'INSERT INTO endpoint_metrics (node_id, route, method, status_code, duration_ms) VALUES ($1, $2, $3, $4, $5)',
        [nodeId, route, method, statusCode, duration]
      );
    } catch (err) {
      // If partition doesn't exist, fallback to main
      await query(
        'INSERT INTO endpoint_metrics (node_id, route, method, status_code, duration_ms) VALUES ($1, $2, $3, $4, $5)',
        [process.env.HUB_NODE_ID || 'hub', route, method, statusCode, duration]
      ).catch(() => {});
    }
  });
}

/**
 * Calculates RPS, P95 Latency, and Error % for a given node over the last minute
 */
export async function getEndpointStats(nodeId: string) {
  const sql = `
    WITH stats AS (
      SELECT 
        duration_ms,
        status_code,
        timestamp
      FROM endpoint_metrics 
      WHERE node_id = $1 AND timestamp > NOW() - INTERVAL '${process.env.NEXUS_METRIC_WINDOW || '1 minute'}'
    )
    SELECT 
      COUNT(*) / 60.0 as rps,
      PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) as p95_latency,
      COUNT(CASE WHEN status_code >= 400 THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0) as error_percent,
      COUNT(*) as total_requests
    FROM stats
  `;
  const res = await query(sql, [nodeId]);
  return res.rows[0];
}

/**
 * Calculates stable baseline (24h history EXCLUDING last 10 minutes)
 * Prevents anomaly poisoning
 */
export async function getBaselineStats(nodeId: string) {
  const sql = `
    SELECT 
      PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) as p95_baseline,
      AVG(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) * 100.0 as error_baseline
    FROM endpoint_metrics 
    WHERE node_id = $1 
      AND timestamp > NOW() - INTERVAL '${process.env.NEXUS_BASELINE_WINDOW || '24 hours'}'
      AND timestamp < NOW() - INTERVAL '${process.env.NEXUS_EXCLUSION_WINDOW || '10 minutes'}'
  `;
  const res = await query(sql, [nodeId]);
  return res.rows[0];
}
