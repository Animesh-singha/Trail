import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import { webhookRoutes } from './routes/webhook.route';
import { incidentRoutes } from './routes/incident.route';
import { controlRoutes } from './routes/control.route';
import { sandboxRoutes } from './routes/sandbox.route';
import { eventRoutes } from './routes/event.route';
import { authRoutes } from './routes/auth.route';

dotenv.config();

const server = Fastify({
  logger: true
});

server.register(cors);

// Register routes
server.register(webhookRoutes, { prefix: '/v1' });
server.register(incidentRoutes, { prefix: '/v1' });
server.register(controlRoutes, { prefix: '/v1' });
server.register(eventRoutes, { prefix: '/v1' });
server.register(authRoutes, { prefix: '/v1' });
server.register(sandboxRoutes, { prefix: '/v1/sandbox' });

server.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

const start = async () => {
  try {
    const port = process.env.PORT ? parseInt(process.env.PORT) : 3001;
    await server.listen({ port, host: '0.0.0.0' });
    server.log.info(`Server running on port ${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
