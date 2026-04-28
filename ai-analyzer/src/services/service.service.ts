import { query } from './db.service';

export interface Service {
  id?: number;
  name: string;
  description?: string;
  owner?: string;
  members: string[]; // Node IDs
}

export class ServiceService {
  /**
   * Create a new logical service
   */
  static async createService(service: Service) {
    const res = await query(
      'INSERT INTO services (name, description, owner) VALUES ($1, $2, $3) RETURNING id',
      [service.name, service.description, service.owner]
    );
    const serviceId = res.rows[0].id;

    if (service.members && service.members.length > 0) {
      for (const nodeId of service.members) {
        await query(
          'INSERT INTO service_members (service_id, node_id) VALUES ($1, $2)',
          [serviceId, nodeId]
        );
      }
    }

    return { id: serviceId, ...service };
  }

  /**
   * List all services with their health summary
   */
  static async getServices() {
    const sql = `
      SELECT s.*, 
             ARRAY_AGG(sm.node_id) as member_ids,
             COUNT(CASE WHEN n.status = 'error' THEN 1 END) as critical_count
      FROM services s
      LEFT JOIN service_members sm ON s.id = sm.service_id
      LEFT JOIN topology_nodes n ON sm.node_id = n.id
      GROUP BY s.id
    `;
    const res = await query(sql);
    return res.rows.map(row => ({
      ...row,
      status: parseInt(row.critical_count) > 0 ? 'error' : 'online'
    }));
  }

  /**
   * Delete a service
   */
  static async deleteService(id: number) {
    return query('DELETE FROM services WHERE id = $1', [id]);
  }
}
