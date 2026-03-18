import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { processIncident } from '../services/incident.service';

interface SandboxTriggerRequest {
  attackType: 'SSH_BRUTE_FORCE' | 'SQL_INJECTION' | 'RESOURCE_EXHAUSTION' | 'DDOS_SPIKE';
  targetNode: string;
}

export const sandboxRoutes = async (fastify: FastifyInstance) => {
  fastify.post('/trigger-incident', async (request: FastifyRequest<{ Body: SandboxTriggerRequest }>, reply: FastifyReply) => {
    const { attackType, targetNode } = request.body;
    
    // Construct a fake Prometheus alert payload based on the attack type
    const mockAlerts: any[] = [];
    
    let alertname = '';
    let severity = '';
    let summary = '';
    
    switch (attackType) {
      case 'SSH_BRUTE_FORCE':
        alertname = 'HighFailedSSHLogins';
        severity = 'critical';
        summary = `Detected >50 failed SSH login attempts from multiple IPs on ${targetNode} port 22.`;
        break;
      case 'SQL_INJECTION':
        alertname = 'SuspiciousWAFPayload';
        severity = 'critical';
        summary = `WAF intercepted multiple UNION SELECT attempts aimed at ${targetNode} login endpoint.`;
        break;
      case 'RESOURCE_EXHAUSTION':
        alertname = 'HostOomKill';
        severity = 'high';
        summary = `Kernel OOM killer invoked on ${targetNode}. Database process targeted.`;
        break;
      case 'DDOS_SPIKE':
        alertname = 'NetworkIngressAnomaly';
        severity = 'critical';
        summary = `Sudden 5000% spike in inbound UDP traffic to ${targetNode}.`;
        break;
      default:
        return reply.status(400).send({ error: 'Unknown attack type' });
    }
    
    const fakeAlert = {
      status: 'firing',
      labels: {
        alertname,
        instance: targetNode,
        severity
      },
      annotations: {
        summary
      },
      startsAt: new Date().toISOString()
    };
    
    mockAlerts.push(fakeAlert);
    
    // Asynchronously trigger the incident pipeline (passing our fake alert)
    // The pipeline will contact Gemini to generate the Root Cause and save it to the DB
    processIncident(mockAlerts, request.log).catch(err => {
      request.log.error(`Sandbox incident error:`, err);
    });
    
    return reply.status(202).send({ 
      success: true, 
      message: `Sandbox incident '${attackType}' injected for ${targetNode}. AI analysis started.` 
    });
  });
};
