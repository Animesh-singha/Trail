import { eventHub } from '../utils/events';

export interface SystemEvent {
  id: string;
  timestamp: string;
  source: 'metric' | 'log' | 'deploy' | 'action' | 'ai';
  severity: 'INFO' | 'SUCCESS' | 'WARNING' | 'CRITICAL';
  message: string;
  service: string;
  metadata?: any;
}

// In-memory store for simulation
let events: SystemEvent[] = [
  { 
    id: 'e1', 
    timestamp: new Date(Date.now() - 3600000).toISOString(), 
    source: 'deploy', 
    severity: 'INFO', 
    message: 'Deployment v1.4.2 started', 
    service: 'nx-api-core' 
  }
];

export const addEvent = (event: Omit<SystemEvent, 'id' | 'timestamp'>) => {
  const newEvent: SystemEvent = {
    ...event,
    id: `e-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString()
  };
  events.push(newEvent);
  return newEvent;
};

export const getEvents = (limit: number = 50) => {
  return [...events].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);
};

export const getEventsByService = (service: string) => {
  return events.filter(e => e.service === service).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

export const getIncidentTimeline = (incidentId: string) => {
  return events; 
};

export const getIncidentAnalysis = (incidentId: string) => {
  return {
    incidentId,
    root_cause: "Correlation successful: Metadata heartbeat confirms server nodes are in healthy sync state.",
    user_impact_percent: 0,
    downstream_nodes_affected: 0,
    confidence: 100,
    suggested_actions: ["Continue monitoring heartbeats"]
  };
};
