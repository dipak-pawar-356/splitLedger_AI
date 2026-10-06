/**
 * Application Performance Monitoring (APM) Metrics Collector
 * Tracks latency percentiles (p50, p95, p99), throughput, error rates, and system uptime.
 */

interface LatencyRecord {
  route: string;
  durationMs: number;
  timestamp: number;
}

export interface MetricSummary {
  totalRequests: number;
  errorCount: number;
  errorRate: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  uptimeSeconds: number;
}

class PerformanceMonitor {
  private latencies: LatencyRecord[] = [];
  private maxRecords = 1000;
  private totalRequests = 0;
  private totalErrors = 0;
  private startTime = Date.now();

  /**
   * Track latency of a completed request or server action
   */
  recordLatency(route: string, durationMs: number): void {
    this.totalRequests++;
    this.latencies.push({
      route,
      durationMs,
      timestamp: Date.now(),
    });

    if (this.latencies.length > this.maxRecords) {
      this.latencies.shift();
    }
  }

  /**
   * Record error event
   */
  recordError(route: string): void {
    this.totalErrors++;
  }

  /**
   * Calculate latency percentiles and performance metrics
   */
  getMetrics(): MetricSummary {
    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    if (this.latencies.length === 0) {
      return {
        totalRequests: this.totalRequests,
        errorCount: this.totalErrors,
        errorRate: 0,
        avgLatencyMs: 0,
        p50LatencyMs: 0,
        p95LatencyMs: 0,
        p99LatencyMs: 0,
        uptimeSeconds,
      };
    }

    const durations = this.latencies.map((l) => l.durationMs).sort((a, b) => a - b);
    const sum = durations.reduce((acc, curr) => acc + curr, 0);
    const avgLatencyMs = Number((sum / durations.length).toFixed(2));

    const p50Index = Math.floor(durations.length * 0.5);
    const p95Index = Math.floor(durations.length * 0.95);
    const p99Index = Math.floor(durations.length * 0.99);

    const errorRate = this.totalRequests === 0
      ? 0
      : Number(((this.totalErrors / this.totalRequests) * 100).toFixed(2));

    return {
      totalRequests: this.totalRequests,
      errorCount: this.totalErrors,
      errorRate,
      avgLatencyMs,
      p50LatencyMs: Number((durations[p50Index] || 0).toFixed(2)),
      p95LatencyMs: Number((durations[p95Index] || 0).toFixed(2)),
      p99LatencyMs: Number((durations[p99Index] || 0).toFixed(2)),
      uptimeSeconds,
    };
  }

  /**
   * Reset telemetry buffer (for testing)
   */
  reset(): void {
    this.latencies = [];
    this.totalRequests = 0;
    this.totalErrors = 0;
    this.startTime = Date.now();
  }
}

export const monitor = new PerformanceMonitor();
