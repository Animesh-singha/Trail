import { FastifyInstance } from 'fastify';
import { pool, saveAuditLog } from '../services/db.service';
import dotenv from 'dotenv';
import { getIncidentAnalytics } from '../services/analytics.service';
import { requirePermission, Permission } from '../utils/auth';
import { systemQueue } from '../services/queue.service';
import { eventHub, EVENTS } from '../utils/events';
import { executeRemediation } from '../services/automation.service';
import { simulateAction } from '../services/simulation.service';
dotenv.config();

export const incidentRoutes = async (server: FastifyInstance) => {
  // Get all incidents
  server.get('/incidents', async (request, reply) => {
    try {
      const res = await pool.query('SELECT * FROM incidents ORDER BY timestamp DESC');
      return res.rows;
    } catch (err) {
      server.log.error(err);
      return reply.code(500).send({ error: 'Failed to fetch incidents' });
    }
  });

  // Get incident analytics
  server.get('/incidents/stats', async (request, reply) => {
    try {
      return await getIncidentAnalytics();
    } catch (err) {
      server.log.error(err);
      return reply.code(500).send({ error: 'Failed to fetch incident stats' });
    }
  });

  // Update incident status
  server.patch('/incidents/:id', { preHandler: [requirePermission(Permission.MANAGE_INCIDENTS)] }, async (request: any, reply) => {
    const { id } = request.params;
    const { status } = request.body;

    try {
      const res = await pool.query(
        'UPDATE incidents SET status = $1 WHERE id = $2 RETURNING *',
        [status, id]
      );
      
      if (res.rows.length === 0) return reply.code(404).send({ error: 'Incident not found' });
      
      // Broadcast update
      eventHub.emit('broadcast', { type: EVENTS.INCIDENT_UPDATED, payload: res.rows[0] });
      
      return res.rows[0];
    } catch (err) {
      server.log.error(err);
      return reply.code(500).send({ error: 'Failed to update incident' });
    }
  });

  // Approve and execute remediation (Queued)
  server.post('/incidents/:id/approve', { preHandler: [requirePermission(Permission.APPROVE_REMEDIATION)] }, async (request: any, reply) => {
    const { id } = request.params;
    const user = request.user as { id: number; username: string; role: string };

    try {
      const res = await pool.query('SELECT * FROM incidents WHERE id = $1', [id]);
      if (res.rows.length === 0) return reply.code(404).send({ error: 'Incident not found' });
      
      const incident = res.rows[0];
      if (incident.status !== 'PENDING_APPROVAL') {
        return reply.code(400).send({ error: 'Only incidents in PENDING_APPROVAL status can be executed' });
      }

      // 1. Push to queue
      const job = await systemQueue.add('EXECUTE_COMMAND', {
        type: 'EXECUTE_COMMAND',
        payload: { action: incident.alert_name, target: incident.service, incident_id: id },
        userId: user.id
      });

      // 2. Clear pending status, set to INVESTIGATING or QUEUED
      await pool.query('UPDATE incidents SET status = $1 WHERE id = $2', ['INVESTIGATING', id]);

      // 3. Log intent
      await saveAuditLog({
        userId: user.id,
        action: 'QUEUE_REMEDIATION',
        target: incident.service,
        command: incident.alert_name,
        status: 'QUEUED',
        result: `Job ${job.id} pending for incident ${id}`,
        sourceIp: request.ip,
        traceId: job.id
      });

      // 4. Broadcast initial state update
      eventHub.emit('broadcast', { type: EVENTS.INCIDENT_UPDATED, payload: { ...incident, status: 'INVESTIGATING' } });

      return { success: true, message: 'Remediation queued successfully', jobId: job.id };
    } catch (err: any) {
      server.log.error(err);
      return reply.code(500).send({ error: 'Failed to queue remediation approval' });
    }
  });
};
