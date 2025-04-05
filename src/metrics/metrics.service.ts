import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { Subject, Observable, from } from 'rxjs';
import { filter, share, map, shareReplay } from 'rxjs/operators';
import { randomUUID } from 'crypto';
import { LoggerService } from '../logger/logger.service';
import {
  Metric,
  MetricType,
  MetricFilter,
  MetricThreshold,
} from './metrics.types';
import { MetricDocument, MetricSchema } from './metrics.schema';
import { hostname } from 'os';
import * as os from 'os'; // Add the missing OS module import

@Injectable()
export class MetricsService {
  private metricSubject = new Subject<Metric>();
  private metricObservable: Observable<Metric>;
  private metricModel: Model<MetricDocument>;
  private thresholds: MetricThreshold[] = [];
  private readonly CONTEXT = 'MetricsService';
  private readonly hostName: string;

  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly logger: LoggerService,
  ) {
    this.hostName = hostname();

    // Create a shared hot observable from the subject
    this.metricObservable = this.metricSubject.pipe(share());

    // Check if connection is valid before initializing model
    if (!this.connection || !this.connection.db) {
      const error = new Error('MongoDB connection is not initialized');
      this.logger.error(error.message, this.CONTEXT, error);
      throw error;
    }

    // Initialize the MongoDB model for metrics
    this.metricModel = this.connection.model<MetricDocument>(
      'Metric',
      MetricSchema,
    );

    // Log initialization
    this.logger.info('Metrics service initialized', this.CONTEXT);

    // Setup default thresholds
    this.setupDefaultThresholds();

    // Subscribe to monitor threshold violations
    this.metricObservable.subscribe((metric) => {
      this.checkThresholds(metric);

      // Save metric to MongoDB
      const metricWithId = {
        ...metric,
        id: metric.id || randomUUID(),
        host: metric.host || this.hostName,
      };

      this.metricModel.create(metricWithId).catch((err: unknown) => {
        const errorMessage = err instanceof Error ? err.message : String(err);
        this.logger.error(
          `Failed to save metric to MongoDB: ${errorMessage}`,
          this.CONTEXT,
          err,
        );
      });
    });

    // Start collecting system metrics
    this.startSystemMetricsCollection();
  }

  private setupDefaultThresholds(): void {
    this.thresholds = [
      {
        type: MetricType.CPU,
        warningThreshold: 70, // 70% CPU usage
        criticalThreshold: 90, // 90% CPU usage
      },
      {
        type: MetricType.MEMORY,
        warningThreshold: 75, // 75% memory usage
        criticalThreshold: 90, // 90% memory usage
      },
      {
        type: MetricType.RESPONSE_TIME,
        warningThreshold: 500, // 500ms
        criticalThreshold: 1000, // 1s
      },
      {
        type: MetricType.ERROR_RATE,
        warningThreshold: 5, // 5% error rate
        criticalThreshold: 10, // 10% error rate
      },
    ];
  }

  private checkThresholds(metric: Metric): void {
    const threshold = this.thresholds.find((t) => t.type === metric.type);

    if (threshold) {
      if (metric.value >= threshold.criticalThreshold) {
        this.logger.error(
          `CRITICAL THRESHOLD EXCEEDED: ${metric.type} = ${metric.value}${metric.unit} (threshold: ${threshold.criticalThreshold}${metric.unit})`,
          this.CONTEXT,
          { metric, threshold },
        );
      } else if (metric.value >= threshold.warningThreshold) {
        this.logger.warn(
          `Warning threshold exceeded: ${metric.type} = ${metric.value}${metric.unit} (threshold: ${threshold.warningThreshold}${metric.unit})`,
          this.CONTEXT,
          { metric, threshold },
        );
      }
    }
  }

  recordMetric(metric: Metric): void {
    this.logger.debug(
      `Recording new metric: ${metric.type} = ${metric.value}${metric.unit}`,
      this.CONTEXT,
    );

    this.metricSubject.next({
      ...metric,
      timestamp: metric.timestamp || new Date(),
    });
  }

  getMetricStream(
    filterOrTypes?: MetricFilter | MetricType[],
  ): Observable<Metric> {
    // Convert simple types array to filter object for backward compatibility
    const metricFilter: MetricFilter = Array.isArray(filterOrTypes)
      ? { types: filterOrTypes }
      : filterOrTypes || {};

    return this.metricObservable.pipe(
      filter((metric) => this.passesFilter(metric, metricFilter)),
    );
  }

  getAllMetrics(filter?: MetricFilter): Observable<Metric[]> {
    // Use proper type definition for MongoDB query
    interface MetricQuery {
      type?: { $in: MetricType[] };
      timestamp?: {
        $gte?: Date;
        $lte?: Date;
      };
      value?: {
        $gte?: number;
        $lte?: number;
      };
      [key: string]: unknown;
    }

    const query: MetricQuery = {};

    // Apply filters to the MongoDB query
    if (filter?.types?.length) {
      query.type = { $in: filter.types };
    }

    if (filter?.fromDate || filter?.toDate) {
      query.timestamp = {};
      if (filter.fromDate) {
        query.timestamp.$gte = filter.fromDate;
      }
      if (filter.toDate) {
        query.timestamp.$lte = filter.toDate;
      }
    }

    if (filter?.minValue !== undefined || filter?.maxValue !== undefined) {
      query.value = {};
      if (filter.minValue !== undefined) {
        query.value.$gte = filter.minValue;
      }
      if (filter.maxValue !== undefined) {
        query.value.$lte = filter.maxValue;
      }
    }

    if (filter?.tags) {
      for (const [key, value] of Object.entries(filter.tags)) {
        query[`tags.${key}`] = value;
      }
    }

    return from(
      this.metricModel.find(query).sort({ timestamp: -1 }).exec(),
    ).pipe(
      map((documents) => documents.map((doc) => doc.toObject() as Metric)),
      shareReplay(1),
    );
  }

  setThresholds(thresholds: MetricThreshold[]): void {
    this.thresholds = thresholds;
    this.logger.info(
      `Updated ${thresholds.length} metric thresholds`,
      this.CONTEXT,
    );
  }

  getThresholds(): MetricThreshold[] {
    return [...this.thresholds];
  }

  private passesFilter(metric: Metric, filter?: MetricFilter): boolean {
    if (!filter) {
      return true;
    }

    // Check metric type
    if (filter.types?.length && !filter.types.includes(metric.type)) {
      return false;
    }

    // Check value range
    if (filter.minValue !== undefined && metric.value < filter.minValue) {
      return false;
    }
    if (filter.maxValue !== undefined && metric.value > filter.maxValue) {
      return false;
    }

    // Check date range with proper null-safety
    if (metric.timestamp && filter.fromDate) {
      const timestamp = metric.timestamp.getTime();
      if (timestamp < filter.fromDate.getTime()) {
        return false;
      }
    }
    if (metric.timestamp && filter.toDate) {
      const timestamp = metric.timestamp.getTime();
      if (timestamp > filter.toDate.getTime()) {
        return false;
      }
    }

    // Check tags (all specified tags must match) with null-safety
    if (filter.tags && metric.tags) {
      for (const [key, value] of Object.entries(filter.tags)) {
        if (metric.tags[key] !== value) {
          return false;
        }
      }
    }

    return true;
  }

  private startSystemMetricsCollection(): void {
    // Start collecting CPU metrics
    setInterval(() => {
      this.collectSystemMetrics();
    }, 5000); // Every 5 seconds

    // Start collecting memory metrics
    setInterval(() => {
      this.collectMemoryMetrics();
    }, 5000); // Every 5 seconds

    this.logger.info('System metrics collection started', this.CONTEXT);
  }

  private collectSystemMetrics(): void {
    try {
      // More accurate CPU calculation using the os module
      const cpuCount = os.cpus().length;

      // Get current CPU load - this is more accurate than just using loadAvg
      // The cpus() function returns an array of objects containing CPU timing information
      const cpus = os.cpus();

      // Calculate overall CPU usage by averaging all cores
      let totalIdle = 0;
      let totalTick = 0;

      // Sum up all CPU time values
      cpus.forEach((cpu) => {
        // Calculate total time spent in all states for this core
        const total = Object.values(cpu.times).reduce(
          (acc, time) => acc + time,
          0,
        );
        totalTick += total;
        totalIdle += cpu.times.idle;
      });

      // Calculate the percentage of CPU used (100% minus idle percentage)
      const cpuUsage = Math.min(100 - (totalIdle / totalTick) * 100, 100);

      // Add more detailed logging of measured CPU values
      this.logger.debug(
        `Raw CPU measurement - totalIdle: ${totalIdle}, totalTick: ${totalTick}, cores: ${cpuCount}`,
        this.CONTEXT,
      );

      this.recordMetric({
        timestamp: new Date(),
        type: MetricType.CPU,
        value: Number(cpuUsage.toFixed(2)), // Round to 2 decimal places
        unit: '%',
        tags: {
          host: os.hostname(),
          source: 'system',
          cores: cpuCount.toString(),
        },
        host: this.hostName,
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to collect CPU metrics: ${errorMessage}`,
        this.CONTEXT,
        error,
      );
    }
  }

  private collectMemoryMetrics(): void {
    try {
      // Use actual system memory information instead of random values
      const totalMem = os.totalmem();
      const freeMem = os.freemem();

      // Calculate memory usage percentage
      const usedMem = totalMem - freeMem;
      const memoryUsagePercent = (usedMem / totalMem) * 100;

      this.recordMetric({
        timestamp: new Date(),
        type: MetricType.MEMORY,
        value: Number(memoryUsagePercent.toFixed(2)), // Round to 2 decimal places
        unit: '%',
        tags: {
          source: 'system',
          host: this.hostName,
          total_mb: Math.round(totalMem / (1024 * 1024)).toString(),
          free_mb: Math.round(freeMem / (1024 * 1024)).toString(),
        },
      });

      // Also record absolute memory usage in MB for more precise tracking
      this.recordMetric({
        timestamp: new Date(),
        type: MetricType.MEMORY_USED,
        value: Number((usedMem / (1024 * 1024)).toFixed(2)),
        unit: 'MB',
        tags: {
          source: 'system',
          host: this.hostName,
        },
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to collect memory metrics: ${errorMessage}`,
        this.CONTEXT,
        error,
      );
    }
  }
}
