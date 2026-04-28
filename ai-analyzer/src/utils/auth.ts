import { FastifyRequest, FastifyReply } from 'fastify';

export enum Permission {
  EXECUTE_COMMAND = 'execute_command',
  TRIGGER_BACKUP = 'trigger_backup',
  APPROVE_REMEDIATION = 'approve_remediation',
  VIEW_AUDIT_LOGS = 'view_audit_logs',
  MANAGE_INCIDENTS = 'manage_incidents',
  VIEW_TOPOLOGY = 'view_topology',
  MANAGE_SERVICES = 'manage_services'
}

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  admin: Object.values(Permission),
  operator: [Permission.VIEW_AUDIT_LOGS, Permission.MANAGE_INCIDENTS, Permission.VIEW_TOPOLOGY, Permission.MANAGE_SERVICES],
  viewer: [Permission.VIEW_AUDIT_LOGS, Permission.VIEW_TOPOLOGY]
};

export const requirePermission = (permission: Permission) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
      const user = request.user as { role: string; id: number };
      
      const permissions = ROLE_PERMISSIONS[user.role] || [];
      if (!permissions.includes(permission)) {
        return reply.code(403).send({ 
          error: 'Insufficient Permission',
          message: `Your role (${user.role}) does not have the '${permission}' capability.` 
        });
      }
    } catch (err) {
      return reply.code(401).send({ error: 'Unauthorized: Invalid or expired access token.' });
    }
  };
};

export const requireRole = (role: string) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
      const user = request.user as { role: string };
      if (user.role !== role && user.role !== 'admin') {
        return reply.code(403).send({ error: 'Permission denied: Insufficient clearance.' });
      }
    } catch (err) {
      return reply.code(401).send({ error: 'Unauthorized: Invalid or expired security token.' });
    }
  };
};
