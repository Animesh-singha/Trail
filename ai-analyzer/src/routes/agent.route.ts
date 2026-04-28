import { FastifyInstance } from 'fastify';
import { DiscoveryService } from '../services/discovery.service';
import { pool } from '../services/db.service';
import { SystemController, SystemMode } from '../utils/system';

export async function agentRoutes(fastify: FastifyInstance) {
  /**
   * Receive heartbeat from VPS agent
   */
  fastify.post('/heartbeat', async (request, reply) => {
    const authHeader = request.headers.authorization;
    const token = process.env.NEXUS_AGENT_TOKEN || 'nexus_secret_agent_token';

    if (!authHeader || authHeader !== `Bearer ${token}`) {
      return reply.status(401).send({ error: 'Unauthorized Agent' });
    }

    try {
      const payload = request.body as any;
      const isHighPri = payload.metadata?.priority === 'high' || payload.manual === true;

      if (!SystemController.shouldProcess(isHighPri)) {
        return reply.status(isHighPri ? 503 : 429).send({ 
          error: 'System Busy', 
          mode: SystemController.getMode() 
        });
      }

      await DiscoveryService.processHeartbeat(payload);
      return { 
        status: 'success', 
        received_at: new Date().toISOString(),
        system_mode: SystemController.getMode()
      };
    } catch (err) {
      console.error('[Agent Route] Error processing heartbeat:', err);
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  /**
   * Fetch full topology for dashboard
   */
  fastify.get('/topology', async (request, reply) => {
    try {
      const nodesRes = await pool.query('SELECT * FROM topology_nodes');
      const edgesRes = await pool.query('SELECT * FROM topology_edges');
      
      return {
        nodes: nodesRes.rows,
        edges: edgesRes.rows
      };
    } catch (err) {
      return reply.status(500).send({ error: 'Database Error' });
    }
  });
}
