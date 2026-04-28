import { EventEmitter } from 'events';

export const eventHub = new EventEmitter();

export const EVENTS = {
  INCIDENT_NEW: 'INCIDENT_NEW',
  INCIDENT_UPDATED: 'INCIDENT_UPDATED',
  TOPOLOGY_UPDATED: 'TOPOLOGY_UPDATED',
  LOG_STREAM: 'LOG_STREAM',
  ACTION_COMPLETED: 'ACTION_COMPLETED',
};
