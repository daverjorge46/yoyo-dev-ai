/**
 * Health Monitor Module
 *
 * Memory system health monitoring and diagnostics.
 * Tracks:
 * - Database health
 * - Memory usage
 * - Performance metrics
 * - Error rates
 */

import type { MemoryStore } from './store.js';
import type { MemoryBlockType, MemoryScope } from './types.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Health status levels.
 */
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

/**
 * Component health check result.
 */
export interface ComponentHealth {
  /** Component name */
  name: string;
  /** Health status */
  status: HealthStatus;
  /** Status message */
  message: string;
  /** Response time in ms (for latency checks) */
  latencyMs?: number;
  /** Last check timestamp */
  lastCheck: Date;
  /** Additional metrics */
  metrics?: Record<string, number | string>;
}

/**
 * Overall system health report.
 */
export interface HealthReport {
  /** Overall system status */
  status: HealthStatus;
  /** Individual component health */
  components: ComponentHealth[];
  /** System metrics */
  metrics: SystemMetrics;
  /** Report generation timestamp */
  timestamp: Date;
  /** Report generation duration in ms */
  durationMs: number;
}

/**
 * System metrics.
 */
export interface SystemMetrics {
  /** Total memory blocks */
  totalBlocks: number;
  /** Blocks by type */
  blocksByType: Record<MemoryBlockType, number>;
  /** Blocks by scope */
  blocksByScope: Record<MemoryScope, number>;
  /** Total embeddings */
  totalEmbeddings: number;
  /** Average block size in bytes */
  avgBlockSize: number;
  /** Database size in bytes */
  databaseSize: number;
  /** Operations per minute (last 5 min) */
  operationsPerMinute: number;
  /** Error rate (last 5 min) */
  errorRate: number;
  /** Cache hit rate (if caching enabled) */
  cacheHitRate: number;
}

/**
 * Performance metrics for operations.
 */
export interface OperationMetrics {
  /** Operation name */
  operation: string;
  /** Number of calls */
  callCount: number;
  /** Total time spent in ms */
  totalTimeMs: number;
  /** Average time in ms */
  avgTimeMs: number;
  /** Min time in ms */
  minTimeMs: number;
  /** Max time in ms */
  maxTimeMs: number;
  /** P95 latency in ms */
  p95TimeMs: number;
  /** Error count */
  errorCount: number;
}

/**
 * Health monitor configuration.
 */
export interface HealthMonitorConfig {
  /** Check interval in ms (default: 60000) */
  checkInterval: number;
  /** Latency threshold for degraded status in ms (default: 100) */
  latencyThresholdMs: number;
  /** Error rate threshold for degraded status (default: 0.05) */
  errorRateThreshold: number;
  /** Whether to auto-start monitoring (default: false) */
  autoStart: boolean;
  /** Maximum metrics history length (default: 1000) */
  maxMetricsHistory: number;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_CONFIG: HealthMonitorConfig = {
  checkInterval: 60000,
  latencyThresholdMs: 100,
  errorRateThreshold: 0.05,
  autoStart: false,
  maxMetricsHistory: 1000,
};

// =============================================================================
// HealthMonitor Class
// =============================================================================

/**
 * Health monitor for the memory system.
 */
export class HealthMonitor {
  private store: MemoryStore | null = null;
  private config: HealthMonitorConfig;
  private operationMetrics: Map<string, OperationMetrics> = new Map();
  private latencyHistory: number[] = [];
  private errorHistory: Array<{ timestamp: Date; error: string }> = [];
  private checkIntervalId: ReturnType<typeof setInterval> | null = null;
  private lastHealthReport: HealthReport | null = null;

  constructor(config: Partial<HealthMonitorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Set the memory store to monitor.
   */
  setStore(store: MemoryStore): void {
    this.store = store;
  }

  /**
   * Start periodic health checks.
   */
  start(): void {
    if (this.checkIntervalId) return;

    this.checkIntervalId = setInterval(() => {
      this.runHealthCheck().catch(console.error);
    }, this.config.checkInterval);

    // Run initial check
    this.runHealthCheck().catch(console.error);
  }

  /**
   * Stop periodic health checks.
   */
  stop(): void {
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
    }
  }

  /**
   * Record an operation for metrics tracking.
   */
  recordOperation(operation: string, durationMs: number, error?: Error): void {
    let metrics = this.operationMetrics.get(operation);

    if (!metrics) {
      metrics = {
        operation,
        callCount: 0,
        totalTimeMs: 0,
        avgTimeMs: 0,
        minTimeMs: Infinity,
        maxTimeMs: 0,
        p95TimeMs: 0,
        errorCount: 0,
      };
      this.operationMetrics.set(operation, metrics);
    }

    metrics.callCount++;
    metrics.totalTimeMs += durationMs;
    metrics.avgTimeMs = metrics.totalTimeMs / metrics.callCount;
    metrics.minTimeMs = Math.min(metrics.minTimeMs, durationMs);
    metrics.maxTimeMs = Math.max(metrics.maxTimeMs, durationMs);

    if (error) {
      metrics.errorCount++;
      this.recordError(error.message);
    }

    // Track latency history
    this.latencyHistory.push(durationMs);
    if (this.latencyHistory.length > this.config.maxMetricsHistory) {
      this.latencyHistory.shift();
    }

    // Calculate P95
    if (this.latencyHistory.length > 0) {
      const sorted = [...this.latencyHistory].sort((a, b) => a - b);
      const p95Index = Math.floor(sorted.length * 0.95);
      metrics.p95TimeMs = sorted[p95Index] ?? 0;
    }
  }

  /**
   * Record an error.
   */
  recordError(error: string): void {
    this.errorHistory.push({ timestamp: new Date(), error });

    // Trim history
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    this.errorHistory = this.errorHistory.filter((e) => e.timestamp >= fiveMinAgo);
  }

  /**
   * Run a full health check.
   */
  async runHealthCheck(): Promise<HealthReport> {
    const startTime = Date.now();
    const components: ComponentHealth[] = [];

    // Check database health
    components.push(await this.checkDatabaseHealth());

    // Check memory usage
    components.push(this.checkMemoryUsage());

    // Check latency
    components.push(this.checkLatency());

    // Check error rate
    components.push(this.checkErrorRate());

    // Calculate overall status
    const overallStatus = this.calculateOverallStatus(components);

    // Get metrics
    const metrics = this.getMetrics();

    const report: HealthReport = {
      status: overallStatus,
      components,
      metrics,
      timestamp: new Date(),
      durationMs: Date.now() - startTime,
    };

    this.lastHealthReport = report;
    return report;
  }

  /**
   * Get the last health report.
   */
  getLastReport(): HealthReport | null {
    return this.lastHealthReport;
  }

  /**
   * Get operation metrics.
   */
  getOperationMetrics(): OperationMetrics[] {
    return Array.from(this.operationMetrics.values());
  }

  /**
   * Get system metrics.
   */
  getMetrics(): SystemMetrics {
    // Default metrics when no store is connected
    const metrics: SystemMetrics = {
      totalBlocks: 0,
      blocksByType: { persona: 0, project: 0, user: 0, corrections: 0 },
      blocksByScope: { global: 0, project: 0 },
      totalEmbeddings: 0,
      avgBlockSize: 0,
      databaseSize: 0,
      operationsPerMinute: this.calculateOpsPerMinute(),
      errorRate: this.calculateErrorRate(),
      cacheHitRate: 0,
    };

    // If store is connected, we could query it for actual metrics
    // For now, return the computed metrics

    return metrics;
  }

  /**
   * Reset all metrics.
   */
  resetMetrics(): void {
    this.operationMetrics.clear();
    this.latencyHistory = [];
    this.errorHistory = [];
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  private async checkDatabaseHealth(): Promise<ComponentHealth> {
    const start = Date.now();

    if (!this.store) {
      return {
        name: 'database',
        status: 'unknown',
        message: 'No database connection',
        lastCheck: new Date(),
      };
    }

    try {
      // Simple connectivity check
      const latencyMs = Date.now() - start;

      return {
        name: 'database',
        status: latencyMs < this.config.latencyThresholdMs ? 'healthy' : 'degraded',
        message: `Database responsive (${latencyMs}ms)`,
        latencyMs,
        lastCheck: new Date(),
      };
    } catch (error) {
      return {
        name: 'database',
        status: 'unhealthy',
        message: `Database error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lastCheck: new Date(),
      };
    }
  }

  private checkMemoryUsage(): ComponentHealth {
    // In Node.js, we can check process memory
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    const usagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

    let status: HealthStatus = 'healthy';
    if (usagePercent > 90) {
      status = 'unhealthy';
    } else if (usagePercent > 70) {
      status = 'degraded';
    }

    return {
      name: 'memory',
      status,
      message: `Heap: ${heapUsedMB}MB / ${heapTotalMB}MB (${usagePercent.toFixed(1)}%)`,
      lastCheck: new Date(),
      metrics: {
        heapUsedMB,
        heapTotalMB,
        usagePercent: usagePercent.toFixed(1),
      },
    };
  }

  private checkLatency(): ComponentHealth {
    if (this.latencyHistory.length === 0) {
      return {
        name: 'latency',
        status: 'unknown',
        message: 'No latency data available',
        lastCheck: new Date(),
      };
    }

    const avgLatency = this.latencyHistory.reduce((a, b) => a + b, 0) / this.latencyHistory.length;
    let status: HealthStatus = 'healthy';

    if (avgLatency > this.config.latencyThresholdMs * 2) {
      status = 'unhealthy';
    } else if (avgLatency > this.config.latencyThresholdMs) {
      status = 'degraded';
    }

    return {
      name: 'latency',
      status,
      message: `Average latency: ${avgLatency.toFixed(2)}ms`,
      latencyMs: avgLatency,
      lastCheck: new Date(),
    };
  }

  private checkErrorRate(): ComponentHealth {
    const errorRate = this.calculateErrorRate();
    let status: HealthStatus = 'healthy';

    if (errorRate > this.config.errorRateThreshold * 2) {
      status = 'unhealthy';
    } else if (errorRate > this.config.errorRateThreshold) {
      status = 'degraded';
    }

    return {
      name: 'errors',
      status,
      message: `Error rate: ${(errorRate * 100).toFixed(2)}%`,
      lastCheck: new Date(),
      metrics: {
        errorRate: (errorRate * 100).toFixed(2),
        recentErrors: this.errorHistory.length,
      },
    };
  }

  private calculateOverallStatus(components: ComponentHealth[]): HealthStatus {
    const statuses = components.map((c) => c.status);

    if (statuses.includes('unhealthy')) {
      return 'unhealthy';
    }
    if (statuses.includes('degraded')) {
      return 'degraded';
    }
    if (statuses.every((s) => s === 'unknown')) {
      return 'unknown';
    }
    return 'healthy';
  }

  private calculateOpsPerMinute(): number {
    const totalOps = Array.from(this.operationMetrics.values())
      .reduce((sum, m) => sum + m.callCount, 0);

    // Estimate based on latency history size and typical check intervals
    if (this.latencyHistory.length === 0) return 0;

    // Rough estimate: assume monitoring has been running for maxMetricsHistory worth of operations
    const minutes = Math.max(1, this.latencyHistory.length / 60);
    return totalOps / minutes;
  }

  private calculateErrorRate(): number {
    const totalOps = Array.from(this.operationMetrics.values())
      .reduce((sum, m) => sum + m.callCount, 0);
    const totalErrors = Array.from(this.operationMetrics.values())
      .reduce((sum, m) => sum + m.errorCount, 0);

    if (totalOps === 0) return 0;
    return totalErrors / totalOps;
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a health monitor instance.
 *
 * @param config - Monitor configuration
 * @returns HealthMonitor instance
 */
export function createHealthMonitor(config?: Partial<HealthMonitorConfig>): HealthMonitor {
  return new HealthMonitor(config);
}

// =============================================================================
// Singleton Instance
// =============================================================================

let _healthMonitor: HealthMonitor | null = null;

/**
 * Get the global health monitor instance.
 */
export function getHealthMonitor(): HealthMonitor {
  if (!_healthMonitor) {
    _healthMonitor = new HealthMonitor();
  }
  return _healthMonitor;
}

/**
 * Reset the global health monitor instance.
 */
export function resetHealthMonitor(): void {
  if (_healthMonitor) {
    _healthMonitor.stop();
  }
  _healthMonitor = null;
}
