import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { listActions } from '../services/control.service';
import { systemQueue } from '../services/queue.service';
import { saveAuditLog, pool } from '../services/db.service';
import { requirePermission, Permission } from '../utils/auth';
import { simulateAction } from '../services/simulation.service';
import { SystemController } from '../utils/system';
import { getBackupHistory } from '../services/backup.service';

export const controlRoutes = async (server: FastifyInstance) => {
  // Simulate an action impact
  server.post('/control/simulate', { preHandler: [requirePermission(Permission.EXECUTE_COMMAND)] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { action, target } = request.body as { action: string, target: string };
    if (!target || !action) return reply.code(400).send({ error: 'Target and action are required' });
    
    try {
      const simulation = await simulateAction(target, action);
      return simulation;
    } catch (err: any) {
      server.log.error(err);
      return reply.code(500).send({ error: 'Simulation failed' });
    }
  });

  // ... (rest of routes)
  // Execute a remote command (Queued)
  server.post('/control/execute', { preHandler: [requirePermission(Permission.EXECUTE_COMMAND)] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { action, target } = request.body as { action: string, target: string };
    const user = request.user as { id: number, role: string };

    if (!target || !action) {
      return reply.code(400).send({ error: 'Target and action are required' });
    }

    try {
      // Push to BullMQ instead of direct execution
      const job = await systemQueue.add(`EXECUTE_${action}`, {
        type: 'EXECUTE_COMMAND',
        payload: { action, target },
        userId: user.id
      });

      // Log the intent to audit logs
      await saveAuditLog({
        userId: user.id,
        action: `QUEUE_COMMAND`,
        target,
        command: action,
        status: 'QUEUED',
        result: `Job ${job.id} pending execution`,
        sourceIp: request.ip,
        traceId: job.id
      });

      return { success: true, message: 'Action queued successfully', jobId: job.id };
    } catch (err: any) {
      server.log.error(err);
      return reply.code(500).send({ error: err.message });
    }
  });

  // Trigger a database backup (Queued)
  server.post('/control/backup', { preHandler: [requirePermission(Permission.TRIGGER_BACKUP)] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { target } = request.body as { target: string };
    const user = request.user as { id: number, role: string };

    if (!target) {
      return reply.code(400).send({ error: 'Target identifier is required for backup' });
    }

    try {
      const job = await systemQueue.add('DATABASE_BACKUP', {
        type: 'DATABASE_BACKUP',
        payload: { target },
        userId: user.id
      });

      await saveAuditLog({
        userId: user.id,
        action: 'QUEUE_BACKUP',
        target,
        command: 'pg_dump',
        status: 'QUEUED',
        result: `Backup job ${job.id} pending`,
        sourceIp: request.ip,
        traceId: job.id
      });

      return { success: true, message: 'Backup queued successfully', jobId: job.id };
    } catch (err: any) {
      server.log.error(err);
      return reply.code(500).send({ error: err.message });
    }
  });
  
  // System Health & Elite Telemetry
  server.get('/control/health', async (request, reply) => {
    try {
      const dbRes = await pool.query("SELECT COUNT(*) as partitions FROM information_schema.tables WHERE table_name LIKE 'endpoint_metrics_%'");
      const health = {
        status: SystemController.getMode(),
        telemetry: SystemController.stats,
        database: {
          partitions: parseInt(dbRes.rows[0].partitions)
        },
        timestamp: new Date().toISOString()
      };
      return health;
    } catch (err) {
      return reply.code(500).send({ error: 'Failed to fetch health stats' });
    }
  });

  server.get('/control/backups', { preHandler: [requirePermission(Permission.TRIGGER_BACKUP)] }, async (request, reply) => {
    try {
      const history = await getBackupHistory();
      return history;
    } catch (err) {
      return reply.code(500).send({ error: 'Failed to fetch backup history' });
    }
  });

  server.get('/control/history', async (request, reply) => {
    try {
      const res = await pool.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 50');
      return res.rows.map(row => ({
        id: row.id,
        target: row.target,
        action: row.action,
        timestamp: row.created_at,
        status: row.status,
        command: row.command
      }));
    } catch (err) {
      return [];
    }
  });
};
