import { FastifyInstance } from 'fastify';
import { ServiceService } from '../services/service.service';
import { requirePermission, Permission } from '../utils/auth';

export async function serviceRoutes(server: FastifyInstance) {
  // List all services
  server.get('/', { preHandler: [requirePermission(Permission.VIEW_TOPOLOGY)] }, async () => {
    return ServiceService.getServices();
  });

  // Create a service
  server.post('/', { preHandler: [requirePermission(Permission.MANAGE_SERVICES)] }, async (request) => {
    const body = request.body as any;
    return ServiceService.createService(body);
  });

  // Delete a service
  server.delete('/:id', { preHandler: [requirePermission(Permission.MANAGE_SERVICES)] }, async (request: any) => {
    const { id } = request.params;
    await ServiceService.deleteService(id);
    return { success: true };
  });
}
