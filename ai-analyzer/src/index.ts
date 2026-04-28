import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import jwt, { JWT } from '@fastify/jwt';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import websocket from '@fastify/websocket';

import { webhookRoutes } from './routes/webhook.route';
import { incidentRoutes } from './routes/incident.route';
import { controlRoutes } from './routes/control.route';
import { sandboxRoutes } from './routes/sandbox.route';
import { eventRoutes } from './routes/event.route';
import { visibilityRoutes } from './routes/visibility.route';
import { authRoutes } from './routes/auth.route';
import { agentRoutes } from './routes/agent.route';
import { serviceRoutes } from './routes/service.route';

import { eventHub } from './utils/events';
import { setupPerformanceTracking } from './utils/performance';
import { systemQueue } from './services/queue.service';

declare module 'fastify' {
  interface FastifyInstance {
    jwt: JWT; // Default namespace (Access)
    refresh: JWT; // Refresh token namespace
  }
}

dotenv.config();

const server = Fastify({
  logger: true,
  rewriteUrl: (req) => req.url || '/', // Ensure URLs are strings
});
// Enable elapsed time for performance tracking
const START_TIME = Symbol('startTime');
server.addHook('onRequest', (request, reply, done) => {
  (reply as any)[START_TIME] = process.hrtime();
  done();
});
server.addHook('onResponse', (request, reply, done) => {
  const diff = process.hrtime((reply as any)[START_TIME]);
  (reply as any).customElapsedTime = (diff[0] * 1e3) + (diff[1] * 1e-6);
  done();
});

// Middleware & Plugins
server.register(cors);
server.register(cookie);
server.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute'
});

// JWT configuration
server.register(jwt, {
  secret: process.env.JWT_SECRET || 'nexus-access-secret',
  messages: {
    badRequestErrorMessage: 'Format is Authorization: Bearer [token]',
    noAuthorizationInHeaderMessage: 'Authorization header is missing!',
    authorizationTokenExpiredMessage: 'The access token has expired',
    authorizationTokenInvalid: 'The access token is invalid'
  }
});

server.register(websocket);

// Register routes
server.register(webhookRoutes, { prefix: '/v1' });
server.register(incidentRoutes, { prefix: '/v1' });
server.register(controlRoutes, { prefix: '/v1' });
server.register(eventRoutes, { prefix: '/v1' });
server.register(visibilityRoutes, { prefix: '/v1' });
server.register(authRoutes, { prefix: '/v1' });
server.register(agentRoutes, { prefix: '/v1/agent' });
server.register(serviceRoutes, { prefix: '/v1/services' });
server.register(sandboxRoutes, { prefix: '/v1/sandbox' });

// Initialize Performance Tracking
setupPerformanceTracking(server as any);

server.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// WebSocket Hub for real-time events
server.register(async (fastify) => {
  fastify.get('/ws', { websocket: true }, (connection, req) => {
    fastify.log.info('New WebSocket client connected');
    
    connection.socket.on('message', (message: any) => {
      // Handle incoming messages if needed
    });

    connection.socket.on('close', () => {
      fastify.log.info('WebSocket client disconnected');
    });
  });
});

// Helper to broadcast to all clients
const broadcast = (type: string, payload: any) => {
  if (!server.websocketServer) return;
  server.websocketServer.clients.forEach((client: any) => {
    if (client.readyState === 1) { // OPEN
      client.send(JSON.stringify({ type, payload, timestamp: new Date().toISOString() }));
    }
  });
};

// Wire up eventHub to WebSocket broadcast
eventHub.on('broadcast', (data: { type: string, payload: any }) => {
  broadcast(data.type, data.payload);
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

// force restart 1774012636591