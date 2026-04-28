import { FastifyInstance } from 'fastify';
import { getSystemTopology, getAppMetrics } from '../services/visibility.service';
import { getFileIntegrityLogs } from '../services/integrity.service';
import { requirePermission, Permission } from '../utils/auth';

export const visibilityRoutes = async (server: FastifyInstance) => {
  // Get full system topology
  server.get('/visibility/topology', { preHandler: [requirePermission(Permission.VIEW_TOPOLOGY)] }, async (request: any, reply) => {
    try {
      const { type, status } = request.query;
      const topology = await getSystemTopology({ type, status });
      return topology;
    } catch (err) {
      server.log.error(err);
      return reply.code(500).send({ error: 'Failed to fetch topology' });
    }
  });

  // Get running apps for a specific server
  server.get('/visibility/apps/:server', { preHandler: [requirePermission(Permission.EXECUTE_COMMAND)] }, async (request: any, reply) => {
    const { server: serverName } = request.params;
    try {
      const apps = await getAppMetrics(serverName);
      return { server: serverName, apps };
    } catch (err) {
      server.log.error(err);
      return reply.code(500).send({ error: 'Failed to fetch app metrics' });
    }
  });

  // Get historical topology snapshots
  server.get('/visibility/snapshots', { preHandler: [requirePermission(Permission.VIEW_TOPOLOGY)] }, async (request: any, reply) => {
    try {
      const { pool: dbPool } = await import('../services/db.service');
      const res = await dbPool.query('SELECT * FROM topology_snapshots ORDER BY timestamp DESC LIMIT 50');
      return res.rows;
    } catch (err) {
      server.log.error(err);
      return reply.code(500).send({ error: 'Failed to fetch snapshots' });
    }
  });

  // Get File Integrity Audit Logs
  server.get('/visibility/integrity', { preHandler: [requirePermission(Permission.VIEW_TOPOLOGY)] }, async (request, reply) => {
    try {
      const logs = await getFileIntegrityLogs();
      return logs;
    } catch (err) {
      server.log.error(err);
      return reply.code(500).send({ error: 'Failed to fetch integrity logs' });
    }
  });
};
