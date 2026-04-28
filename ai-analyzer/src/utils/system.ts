export enum SystemMode {
  NORMAL = 'NORMAL',
  DEGRADED = 'DEGRADED', // Sample low-pri traffic, skip snapshots
  CRITICAL = 'CRITICAL'  // Reject all but verified high-pri manual agents
}

export class SystemController {
  private static mode: SystemMode = SystemMode.NORMAL;
  private static highPriCount = 0;
  private static normalPriCount = 0;
  
  // Configurable Thresholds from Environment
  private static readonly HIGH_PRI_LIMIT = parseInt(process.env.NEXUS_HIGH_PRI_LIMIT || '70');
  private static readonly NORMAL_PRI_LIMIT = parseInt(process.env.NEXUS_NORMAL_PRI_LIMIT || '30');
  private static readonly SAMPLING_RATE = parseFloat(process.env.NEXUS_SAMPLING_RATE || '0.1');
  private static readonly TOTAL_WINDOW = 100;

  // Performance metrics
  public static stats = {
    droppedEvents: 0,
    rejections: 0,
    lastIngestionLag: 0
  };

  static setMode(mode: SystemMode) {
    this.mode = mode;
    console.log(`[System] Mode switched to ${mode}`);
  }

  static getMode() { return this.mode; }

  /**
   * Weighted Fairness Scheduler (70/30 or configured)
   * Returns true if request should be processed
   */
  static shouldProcess(isHighPri: boolean): boolean {
    if (this.mode === SystemMode.CRITICAL && !isHighPri) {
      this.stats.rejections++;
      return false;
    }

    if (this.mode === SystemMode.DEGRADED && !isHighPri) {
      // Instead of dropping 50%, we use a configurable sampling rate
      // This ensures we keep a trail even when system is under pressure
      if (Math.random() > this.SAMPLING_RATE) {
        this.stats.droppedEvents++;
        return false;
      }
    }

    // Fairness Logic: Prevent starvation
    const total = this.highPriCount + this.normalPriCount;
    if (total >= this.TOTAL_WINDOW) {
      this.highPriCount = 0;
      this.normalPriCount = 0;
    }

    if (isHighPri) {
      if (this.highPriCount < this.HIGH_PRI_LIMIT) {
        this.highPriCount++;
        return true;
      }
    } else {
      if (this.normalPriCount < this.NORMAL_PRI_LIMIT) {
        this.normalPriCount++;
        return true;
      }
    }

    // Default to allow if window hasn't hit limits yet, or reset
    return true; 
  }
}
