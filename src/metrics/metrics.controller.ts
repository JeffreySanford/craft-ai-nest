import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Res,
  Header,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { MetricsService } from './metrics.service';
import { LoggerService } from '../logger/logger.service';
import {
  Metric,
  MetricType,
  MetricFilter,
  MetricThreshold,
} from './metrics.types';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('metrics')
@Controller('metrics')
export class MetricsController {
  private readonly CONTEXT = 'MetricsController';

  constructor(
    private readonly metricsService: MetricsService,
    private readonly logger: LoggerService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get current system metrics',
    description: 'Returns a snapshot of all current system metrics',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the current system metrics',
    schema: {
      type: 'object',
      properties: {
        cpu: { type: 'number', description: 'CPU utilization percentage' },
        memory: { type: 'number', description: 'Memory usage in MB' },
        uptime: { type: 'number', description: 'System uptime in seconds' },
        requestRate: { type: 'number', description: 'Requests per second' },
        timestamp: {
          type: 'string',
          format: 'date-time',
          description: 'Timestamp of metrics collection',
        },
      },
    },
  })
  getAllMetrics(
    @Query('type') typesStr?: string,
    @Query('from') fromDate?: string,
    @Query('to') toDate?: string,
    @Query('minValue') minValue?: string,
    @Query('maxValue') maxValue?: string,
  ): Observable<Metric[]> {
    this.logger.debug(
      `Received request to get metrics with filters - types: ${typesStr}, from: ${fromDate}, to: ${toDate}, min: ${minValue}, max: ${maxValue}`,
      this.CONTEXT,
    );

    // Parse query parameters
    const filter: MetricFilter = {};

    if (typesStr) {
      const types = typesStr.split(',') as MetricType[];
      filter.types = types.filter((t) => Object.values(MetricType).includes(t));
    }

    if (fromDate) {
      filter.fromDate = new Date(fromDate);
    }

    if (toDate) {
      filter.toDate = new Date(toDate);
    }

    if (minValue !== undefined) {
      filter.minValue = Number(minValue);
    }

    if (maxValue !== undefined) {
      filter.maxValue = Number(maxValue);
    }

    this.logger.debug(
      `Filtering metrics with: ${JSON.stringify(filter)}`,
      this.CONTEXT,
    );

    return this.metricsService.getAllMetrics(filter).pipe(
      catchError((err) => {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(
          `Failed to retrieve metrics: ${message}`,
          this.CONTEXT,
          err,
        );
        return throwError(
          () =>
            new HttpException(
              'Failed to retrieve metrics',
              HttpStatus.INTERNAL_SERVER_ERROR,
            ),
        );
      }),
    );
  }

  @Get('thresholds')
  getThresholds(): MetricThreshold[] {
    return this.metricsService.getThresholds();
  }

  @Post('thresholds')
  updateThresholds(@Body() thresholds: MetricThreshold[]): {
    success: boolean;
  } {
    try {
      this.metricsService.setThresholds(thresholds);
      return { success: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to update thresholds: ${message}`,
        this.CONTEXT,
        error,
      );
      throw new HttpException(
        'Failed to update thresholds',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post()
  recordMetric(@Body() metric: Metric): { success: boolean } {
    try {
      this.metricsService.recordMetric(metric);
      return { success: true };
    } catch (error) {
      this.logger.error(
        `Failed to record metric: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        this.CONTEXT,
        error,
      );
      throw new HttpException(
        'Failed to record metric',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('view')
  getMetricsView(@Res() res: Response): void {
    const userAgent = res.req.headers['user-agent'] || 'unknown';
    const ip = res.req.ip || 'unknown';

    this.logger.debug(
      `Serving metrics view page to ${ip} (${userAgent.substring(0, 50)}...)`,
      this.CONTEXT,
    );

    try {
      res.sendFile('metrics/viewer.html', { root: 'src/views' });
      this.logger.debug('Metrics view page served successfully', this.CONTEXT);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to serve metrics view: ${message}`,
        this.CONTEXT,
        error,
      );
      res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .send('Error loading metrics view');
    }
  }

  @Get('stream')
  @Header('Content-Type', 'text/event-stream')
  @Header('Cache-Control', 'no-cache')
  @Header('Connection', 'keep-alive')
  streamMetrics(
    @Query('type') typesStr?: string,
    @Query('minValue') minValue?: string,
    @Query('maxValue') maxValue?: string,
    @Res() response?: Response,
  ): void {
    this.logger.debug('Client connected to metrics stream', this.CONTEXT);

    // Validate response object is available
    if (!response) {
      this.logger.error(
        'Response object is undefined in streamMetrics',
        this.CONTEXT,
      );
      return;
    }

    // Parse filter parameters
    const filter: MetricFilter = {};

    if (typesStr) {
      const types = typesStr.split(',') as MetricType[];
      filter.types = types.filter((t) => Object.values(MetricType).includes(t));
    }

    if (minValue !== undefined) {
      filter.minValue = Number(minValue);
    }

    if (maxValue !== undefined) {
      filter.maxValue = Number(maxValue);
    }

    // Log filter information
    this.logger.debug(
      `Streaming metrics with filter: ${JSON.stringify(filter)}`,
      this.CONTEXT,
    );

    // Send initial heartbeat
    response.write('data: {"type":"connected"}\n\n');

    // Setup metrics stream subscription
    const subscription = this.metricsService.getMetricStream(filter).subscribe({
      next: (metric) => {
        try {
          if (response.writable) {
            response.write(`data: ${JSON.stringify(metric)}\n\n`);
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          this.logger.error(
            `Error writing to stream: ${message}`,
            this.CONTEXT,
            err,
          );
        }
      },
      error: (error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Error in metrics stream: ${message}`,
          this.CONTEXT,
          error,
        );

        try {
          if (response.writable) {
            const errorMessage =
              error instanceof Error ? error.message : 'Unknown error';
            response.write(
              `data: {"type":"error","message":"${errorMessage.replace(/"/g, '\\"')}"}\n\n`,
            );
            response.end();
          }
        } catch (writeErr: unknown) {
          const message =
            writeErr instanceof Error ? writeErr.message : String(writeErr);
          this.logger.error(
            `Failed to send error to client: ${message}`,
            this.CONTEXT,
          );
        }
      },
      complete: () => {
        this.logger.debug('Metrics stream completed normally', this.CONTEXT);
        if (response.writable) {
          response.end();
        }
      },
    });

    // Handle client disconnect
    response.on('close', () => {
      this.logger.debug(
        'Client disconnected from metrics stream',
        this.CONTEXT,
      );
      subscription.unsubscribe();
    });
  }
}
