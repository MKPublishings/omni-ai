/**
 * @module Metrics Middleware
 * @spec: system-observability
 * 
 * Records request metrics (latency, status, path) to KV for aggregation.
 * Runs on every API request to build observability dashboard data.
 * Metrics are keyed by minute and aggregated for trending.
 */

export interface RequestMetric {
  path: string;
  method: string;
  status: number;
  durationMs: number;
  timestamp: string;
  region: string;
}

export class MetricsCollector {
  private cache: KVNamespace;
  private buffer: RequestMetric[] = [];

  constructor(cache: KVNamespace) {
    this.cache = cache;
  }

  /**
   * Record a completed request
   */
  record(metric: RequestMetric): void {
    this.buffer.push(metric);
  }

  /**
   * Flush buffered metrics to KV.
   * Groups by minute bucket for time-series aggregation.
   * Call at end of request via ctx.waitUntil()
   */
  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const minuteKey = this.getMinuteKey();
    const kvKey = `metrics:${minuteKey}`;

    try {
      // Append to existing metrics for this minute bucket
      const existing = await this.cache.get(kvKey, 'json');
      const merged = [...((existing as RequestMetric[]) || []), ...this.buffer];

      // Keep last 1440 minutes of data (24 hours)
      await this.cache.put(kvKey, JSON.stringify(merged.slice(-1000)), {
        expirationTtl: 86400, // 24 hours
      });

      // Also update 5-min and 1-hour aggregate buckets
      await this.updateAggregates(minuteKey);
    } catch (error) {
      console.error('[MetricsCollector] Flush error:', error);
      // Don't fail the request if metrics recording fails
    }

    this.buffer = [];
  }

  /**
   * Get current minute bucket key in ISO format
   * Returns: "YYYY-MM-DDTHH:MM"
   */
  private getMinuteKey(): string {
    const now = new Date();
    const y = String(now.getUTCFullYear()).padStart(4, '0');
    const mo = String(now.getUTCMonth() + 1).padStart(2, '0');
    const d = String(now.getUTCDate()).padStart(2, '0');
    const h = String(now.getUTCHours()).padStart(2, '0');
    const mi = String(now.getUTCMinutes()).padStart(2, '0');
    return `${y}-${mo}-${d}T${h}:${mi}`;
  }

  /**
   * Update hourly and 5-minute aggregate buckets
   */
  private async updateAggregates(minuteKey: string): Promise<void> {
    // Extract hour from minute key: "2026-04-08T14:23" -> "2026-04-08T14:00"
    const [datePart, timePart] = minuteKey.split('T');
    const hour = timePart?.split(':')[0];
    if (hour) {
      const hourKey = `metrics:hourly:${datePart}T${hour}:00`;
      await this.cache.put(
        hourKey,
        JSON.stringify({ updated: new Date().toISOString(), count: this.buffer.length }),
        { expirationTtl: 604800 } // 7 days
      );
    }
  }

  /**
   * Compute aggregated metrics from KV.
   * Used by GET /api/system/metrics endpointfor aggregation across time windows.
   */
  async getAggregated(minutes: number = 5): Promise<{
    requestCount: number;
    errorCount: number;
    errorRate: number;
    avgLatency: number;
    p95Latency: number;
    p99Latency: number;
    requestsPerMinute: number;
    statusCodes: Record<number, number>;
  }> {
    const results: RequestMetric[] = [];

    // Read last N minute buckets
    for (let i = 0; i < minutes; i++) {
      const date = new Date(Date.now() - i * 60 * 1000);
      const y = String(date.getUTCFullYear()).padStart(4, '0');
      const mo = String(date.getUTCMonth() + 1).padStart(2, '0');
      const d = String(date.getUTCDate()).padStart(2, '0');
      const h = String(date.getUTCHours()).padStart(2, '0');
      const mi = String(date.getUTCMinutes()).padStart(2, '0');
      const key = `metrics:${y}-${mo}-${d}T${h}:${mi}`;

      try {
        const data = await this.cache.get(key, 'json');
        if (Array.isArray(data)) {
          results.push(...(data as RequestMetric[]));
        }
      } catch {
        // Key doesn't exist yet, skip
      }
    }

    if (results.length === 0) {
      return {
        requestCount: 0,
        errorCount: 0,
        errorRate: 0,
        avgLatency: 0,
        p95Latency: 0,
        p99Latency: 0,
        requestsPerMinute: 0,
        statusCodes: {},
      };
    }

    // Compute aggregates
    const errorCount = results.filter((m) => m.status >= 400).length;
    const durations = results.map((m) => m.durationMs).sort((a, b) => a - b);
    const statusCodes: Record<number, number> = {};

    results.forEach((m) => {
      statusCodes[m.status] = (statusCodes[m.status] || 0) + 1;
    });

    const p95Index = Math.floor(durations.length * 0.95);
    const p99Index = Math.floor(durations.length * 0.99);

    return {
      requestCount: results.length,
      errorCount,
      errorRate: Number(((errorCount / results.length) * 100).toFixed(2)),
      avgLatency: Math.round(results.reduce((a, b) => a + b.durationMs, 0) / results.length),
      p95Latency: durations[p95Index] || 0,
      p99Latency: durations[p99Index] || 0,
      requestsPerMinute: Math.round(results.length / minutes),
      statusCodes,
    };
  }
}
