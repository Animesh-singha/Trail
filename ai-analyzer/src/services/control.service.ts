/**
 * Control Service: Executes system commands on target nodes via SSH.
 * In a sandbox environment, we simulate these actions and log them.
 */

export interface ControlActionResult {
  success: boolean;
  message: string;
  command: string;
  action?: string;
  timestamp?: string;
}

export const executeServerAction = async (target: string, action: string): Promise<ControlActionResult> => {
  console.log(`[ACTION] Executing ${action} on ${target}...`);
    
  // Security: Only allow white-listed actions
  let command = '';
  switch (action) {
    case 'RESTART_NGINX':
      command = 'systemctl restart nginx';
      break;
    case 'REBOOT_SERVER':
      command = 'reboot';
      break;
    case 'CLEANUP_DISK':
      command = 'journalctl --vacuum-time=1d';
      break;
    case 'RESTART_NODE':
      command = 'pm2 restart all';
      break;
    default:
      return { success: false, message: 'Forbidden or unrecognized control action.', command: '' }; // Added command: '' for type safety
  }

  // Simulate execution for now to avoid actual system side-effects during dev/review
  // In production, this would use require('child_process').exec
  await new Promise(r => setTimeout(r, 1500));
  const success = Math.random() > 0.1;

  return {
    success,
    action,
    command,
    message: success ? `Successfully executed ${action} on ${target}` : `Failed to execute ${action} - System error`,
    timestamp: new Date().toISOString()
  };
};

export const listActions = async () => {
  return [
    { id: 'RESTART_NGINX', label: 'Restart Nginx' },
    { id: 'REBOOT_SERVER', label: 'Reboot Server' },
    { id: 'CLEANUP_DISK', label: 'Cleanup Disk' },
    { id: 'RESTART_NODE', label: 'Restart PM2 Node' }
  ];
};
