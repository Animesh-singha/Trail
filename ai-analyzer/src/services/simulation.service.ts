import { pool } from './db.service';

export interface ActionImpact {
  primary: string;
  secondary: string[];
  risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  estimatedDuration: string;
}

const ACTION_PROFILES: Record<string, ActionImpact> = {
  'RESTART_NGINX': {
    primary: 'Restarts the web server to apply configuration changes.',
    secondary: ['Temporary connection drop (~2 seconds)', 'Active SSL handshakes may fail'],
    risk: 'LOW',
    estimatedDuration: '2-5 seconds'
  },
  'REBOOT_SERVER': {
    primary: 'Full system restart.',
    secondary: ['Complete downtime (2-5 minutes)', 'All active sessions terminated', 'Potential filesystem check on boot'],
    risk: 'HIGH',
    estimatedDuration: '3-5 minutes'
  },
  'CLEANUP_DISK': {
    primary: 'Removes old logs and temporary files.',
    secondary: ['CPU spike during compression', 'I/O wait increase', 'Irreversible loss of unarchived logs'],
    risk: 'MEDIUM',
    estimatedDuration: '30-60 seconds'
  },
  'RESTART_NODE': {
    primary: 'Restarts the application process manager (PM2).',
    secondary: ['API downtime (10-20 seconds)', 'Active user sessions terminated', 'Memory buffers cleared'],
    risk: 'MEDIUM',
    estimatedDuration: '15-30 seconds'
  },
  'IP_BLOCK': {
    primary: 'Adds suspicious IP to system firewall.',
    secondary: ['Risk of false positive (blocking legitimate users)', 'Increased firewall rule complexity'],
    risk: 'LOW',
    estimatedDuration: '1 second'
  }
};

export const simulateAction = async (target: string, action: string) => {
  const profile = ACTION_PROFILES[action] || {
    primary: 'Unknown action impact.',
    secondary: ['No secondary effects documented.'],
    risk: 'MEDIUM',
    estimatedDuration: 'Unknown'
  };

  // 1. Calculate Historical Success Rate from Audit Logs
  let successRate = 0;
  let totalRuns = 0;
  try {
    const res = await pool.query(
      "SELECT count(*) as total, count(*) filter (where status = 'SUCCESS') as success FROM audit_logs WHERE action = $1",
      [`EXECUTE_${action}`]
    );
    totalRuns = parseInt(res.rows[0].total);
    const successCount = parseInt(res.rows[0].success);
    successRate = totalRuns > 0 ? Math.round((successCount / totalRuns) * 100) : 100; // Default to 100 if never run
  } catch (err) {
    console.error('Error fetching historical stats:', err);
  }

  // 2. Context Awareness (Simulated for V1)
  // In a real system, we'd check current traffic/CPU/Load here
  const isHighTraffic = Math.random() > 0.7; // Simulating peak hour check
  let contextWarning = '';
  let riskOverride = profile.risk;

  if (isHighTraffic && profile.risk !== 'LOW') {
    riskOverride = 'HIGH';
    contextWarning = '⚠ Detected high traffic volume. Executing this now may impact more users than usual.';
  }

  return {
    action,
    target,
    simulation: {
      ...profile,
      risk: riskOverride,
      successRate,
      historicalCount: totalRuns,
      contextWarning,
      timestamp: new Date().toISOString()
    }
  };
};
