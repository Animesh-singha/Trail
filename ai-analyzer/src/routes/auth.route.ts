import { FastifyInstance } from 'fastify';
import { saveAuthLog, getAuthLogs, verifyUser } from '../services/db.service';

export const authRoutes = async (server: FastifyInstance) => {
  server.post('/auth/login', async (request: any, reply) => {
    const { username, password } = request.body;
    
    if (!username || !password) {
      return reply.code(400).send({ error: 'Username and password are required' });
    }

    try {
      const user = await verifyUser(username, password);
      
      // Update logging status based on verification result
      const logStatus = user ? 'SUCCESS' : 'FAILED';
      await saveAuthLog({ 
        username, 
        ip: request.ip, 
        status: logStatus, 
        userAgent: request.headers['user-agent'] 
      });

      if (!user) {
        return reply.code(401).send({ error: 'Invalid credentials' });
      }

      return { success: true, user: { id: user.id, username: user.username, role: user.role } };
    } catch (err: any) {
      server.log.error(err);
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  });

  server.post('/auth/log', async (request: any, reply) => {
    const { username, status } = request.body;
    const ip = request.ip;
    const userAgent = request.headers['user-agent'];

    if (!username || !status) {
      return reply.code(400).send({ error: 'Username and status are required' });
    }

    try {
      const log = await saveAuthLog({ username, ip, status, userAgent });
      return log;
    } catch (err: any) {
      server.log.error(err);
      return reply.code(500).send({ error: err.message });
    }
  });

  server.get('/auth/history', async (request, reply) => {
    try {
      const logs = await getAuthLogs(20);
      return logs;
    } catch (err: any) {
      server.log.error(err);
      return reply.code(500).send({ error: err.message });
    }
  });
};
