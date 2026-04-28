import { FastifyInstance, FastifyRequest } from 'fastify';
import { saveAuthLog, getAuthLogs, verifyUser, query } from '../services/db.service';

export const authRoutes = async (server: FastifyInstance) => {
  server.post('/auth/login', async (request: any, reply) => {
    const { username, password } = request.body;
    
    if (!username || !password) {
      return reply.code(400).send({ error: 'Username and password are required' });
    }

    // --- HARDCODED CREDENTIALS (Requested for robust bypass) ---
    if (username === 'singhaanimesh216@gmail.com' && password === '1234qwer') {
      const hardcodedUser = { id: 1, username: 'singhaanimesh216@gmail.com', role: 'admin' };
      const accessToken = server.jwt.sign(
        { id: hardcodedUser.id, username: hardcodedUser.username, role: hardcodedUser.role },
        { expiresIn: '15m' }
      );
      return { 
        success: true, 
        accessToken, 
        user: hardcodedUser 
      };
    }
    // -----------------------------------------------------------

    try {
      const user = await verifyUser(username, password);
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

      // 1. Generate Access Token (15 mins)
      const accessToken = server.jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        { expiresIn: '15m' }
      );

      // 2. Generate Refresh Token (7 days)
      const refreshToken = server.jwt.sign(
        { id: user.id },
        { 
          expiresIn: '7d', // Uses expiresIn instead of secret override for now unless needed
          // @ts-ignore - explicitly using a different secret if needed, 
          // but for this project we'll use the main one or just sign with default
        }
      );

      // 3. Set Refresh Token in HttpOnly Cookie
      reply.setCookie('refreshToken', refreshToken, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 // 7 days in seconds
      });

      return { 
        success: true, 
        accessToken, 
        user: { id: user.id, username: user.username, role: user.role } 
      };
    } catch (err: any) {
      server.log.error(err);
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  });

  server.post('/auth/refresh', async (request: any, reply) => {
    try {
      // Verify refresh token from cookie
      // Verify refresh token (simplified)
      const decoded = await request.jwtVerify() as { id: number };
      
      const res = await query('SELECT username, role FROM users WHERE id = $1', [decoded.id]);
      if (res.rows.length === 0) return reply.code(401).send({ error: 'User no longer exists' });

      const user = res.rows[0];
      const newAccessToken = server.jwt.sign(
        { id: decoded.id, username: user.username, role: user.role },
        { expiresIn: '15m' }
      );

      return { accessToken: newAccessToken };
    } catch (err) {
      return reply.code(401).send({ error: 'Invalid or expired refresh token' });
    }
  });

  server.post('/auth/logout', async (request, reply) => {
    reply.clearCookie('refreshToken', { path: '/' });
    return { success: true, message: 'Logged out successfully' };
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
