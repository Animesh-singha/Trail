import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { executeServerAction } from './control.service';
import { executeDatabaseBackup } from './backup.service';
import { saveAuditLog } from './db.service';
import { eventHub, EVENTS } from '../utils/events';

// Redis connection options
const connectionOpts = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null
};

// Fallback In-Memory Queue for "Redis Safe Mode"
class LocalQueue {
  private handlers: ((job: any) => Promise<any>)[] = [];
  async add(name: string, data: any) {
    console.log(`[SAFE-MODE] Locally queuing job: ${name}`);
    // Simulate async execution
    setTimeout(async () => {
      for (const handler of this.handlers) {
        await handler({ id: `local-${Date.now()}`, data });
      }
    }, 100);
    return { id: `local-${Date.now()}` };
  }
  process(handler: (job: any) => Promise<any>) {
    this.handlers.push(handler);
  }
}

// 1. Define the System Queue with Fallback
let systemQueue: any;
let isRedisSafeMode = false;

try {
  systemQueue = new Queue('system-actions', { 
    connection: connectionOpts,
    defaultJobOptions: { removeOnComplete: true }
  });
  // Quick ping check
  const redis = new IORedis({ ...connectionOpts, retryStrategy: () => null }); // No retry for check
  redis.on('error', (err) => {
    if (!isRedisSafeMode) {
      console.warn('--------------------------------------------------');
      console.warn(`[REDIS] Connection failed at ${connectionOpts.host}:${connectionOpts.port}`);
      console.warn('[SYSTEM] Switching to SAFE MODE (In-Memory Fallback)');
      console.warn('[INFO] Standard BullMQ features (persistence/retries) are disabled.');
      console.warn('--------------------------------------------------');
      isRedisSafeMode = true;
      systemQueue = new LocalQueue();
    }
  });
} catch (e) {
  if (!isRedisSafeMode) {
    console.warn('[REDIS] Initialization failed. Using SAFE MODE.');
    isRedisSafeMode = true;
    systemQueue = new LocalQueue();
  }
}

export { systemQueue };

// 2. Define the Worker logic
const processJob = async (job: Job | any) => {
  const { type, payload, userId } = job.data;
  const startTime = Date.now();

  console.log(`[QUEUE] Processing job ${job.id} of type ${type}`);

  try {
    let result: any;
    
    switch (type) {
      case 'EXECUTE_COMMAND':
        result = await executeServerAction(payload.target, payload.action);
        break;
      
      case 'DATABASE_BACKUP':
        result = await executeDatabaseBackup(payload.target);
        break;
        
      default:
        throw new Error(`Unknown job type: ${type}`);
    }

    // Update Audit Log on completion
    await saveAuditLog({
      userId,
      action: type,
      target: payload.target,
      command: result.command || type,
      status: result.success ? 'SUCCESS' : 'FAILED',
      result: result.message || result.error,
      traceId: job.id,
      durationMs: Date.now() - startTime
    });

    // Broadcast success via eventHub
    eventHub.emit('broadcast', { 
      type: EVENTS.INCIDENT_UPDATED, 
      payload: { ...payload, status: result.success ? 'COMPLETED' : 'FAILED', job_id: job.id } 
    });

    return result;

  } catch (err: any) {
    console.error(`[QUEUE] Job ${job.id} failed:`, err);
    
    await saveAuditLog({
      userId,
      action: type,
      target: payload.target,
      command: type,
      status: 'CRITICAL_ERROR',
      result: err.message,
      traceId: job.id,
      durationMs: Date.now() - startTime
    });
    
    throw err;
  }
};

if (!isRedisSafeMode) {
  const worker = new Worker('system-actions', processJob, { connection: connectionOpts });
  worker.on('completed', (job) => console.log(`[QUEUE] Job ${job.id} completed`));
  worker.on('failed', (job, err) => console.error(`[QUEUE] Job ${job?.id} failed: ${err.message}`));
} else {
  (systemQueue as LocalQueue).process(processJob);
}
