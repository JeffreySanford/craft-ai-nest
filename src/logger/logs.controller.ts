import {
  Controller,
  Get,
  Query,
  HttpException,
  HttpStatus,
  Res,
  Header,
  Body,
  Post,
} from '@nestjs/common';
import { LoggerService, LogLevel, LogEntry, LogFilter } from './logger.service';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Response } from 'express';
import { TemplateService } from '../shared/templates/template.service';

@Controller('logs')
export class LogsController {
  constructor(
    private readonly logger: LoggerService,
    private readonly templateService: TemplateService,
  ) {}

  // This method needs to be BEFORE the :id route to ensure proper route matching
  @Get()
  getAllLogs(
    @Query('level') level?: string,
    @Query('maxLevel') maxLevel?: string,
    @Query('context') context?: string,
    @Query('from') fromDate?: string,
    @Query('to') toDate?: string,
    @Query('pattern') pattern?: string,
  ): Observable<LogEntry[]> {
    this.logger.debug(
      'Received request to get logs with filters',
      'LogsController',
    );

    // Build the filter object
    const filter = this.buildLogFilter(
      level,
      maxLevel,
      context,
      pattern,
      fromDate,
      toDate,
    );

    this.logger.debug(
      `Filtering logs with: ${JSON.stringify(filter)}`,
      'LogsController',
    );

    return this.logger.getAllLogs(filter).pipe(
      catchError((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(
          `Failed to retrieve logs: ${message}`,
          'LogsController',
          err,
        );
        return throwError(
          () =>
            new HttpException(
              'Failed to retrieve logs',
              HttpStatus.INTERNAL_SERVER_ERROR,
            ),
        );
      }),
    );
  }

  // This view route needs to be before the :id route to ensure it's matched correctly
  @Get('view')
  async getLogsView(
    @Res() res: Response,
    @Query('level') level?: string,
    @Query('maxLevel') maxLevel?: string,
    @Query('context') context?: string,
    @Query('pattern') pattern?: string,
  ): Promise<void> {
    this.logger.debug(
      'Serving logs view page with streaming',
      'LogsController',
    );

    try {
      // Render the template from file
      const html = await this.templateService.render('logs/viewer.html', {
        level: level || '',
        maxLevel: maxLevel || '',
        context: context || '',
        pattern: pattern || '',
      });
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
      this.logger.debug('Logs view page served successfully', 'LogsController');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to serve logs view: ${message}`,
        'LogsController',
        error,
      );
      res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .send('Error loading logs view');
    }
  }

  @Get('stream')
  @Header('Content-Type', 'text/event-stream')
  @Header('Cache-Control', 'no-cache')
  @Header('Connection', 'keep-alive')
  streamLogs(
    @Query('level') level?: string,
    @Query('maxLevel') maxLevel?: string,
    @Query('context') context?: string,
    @Query('pattern') pattern?: string,
    @Res() response?: Response,
  ): void {
    this.logger.debug('Client connected to log stream', 'LogsController');

    // Validate response object is available
    if (!response) {
      this.logger.error(
        'Response object is undefined in streamLogs',
        'LogsController',
      );
      return;
    }

    // Build the filter object
    const filter: LogFilter = this.buildLogFilter(
      level,
      maxLevel,
      context,
      pattern,
    );

    // Log filter information
    this.logger.debug(
      `Streaming logs with filter: ${JSON.stringify(filter)}`,
      'LogsController',
    );

    // Send initial heartbeat
    response.write('data: {"type":"connected"}\n\n');

    // Setup logstream subscription with better error handling
    const subscription = this.logger.getLogStream(filter).subscribe({
      next: (log) => {
        try {
          if (response.writable) {
            response.write(`data: ${JSON.stringify(log)}\n\n`);
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          this.logger.error(
            `Error writing to stream: ${message}`,
            'LogsController',
            err,
          );
        }
      },
      error: (error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Error in log stream: ${message}`,
          'LogsController',
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
            'LogsController',
          );
        }
      },
      complete: () => {
        this.logger.debug('Log stream completed normally', 'LogsController');
        if (response.writable) {
          response.end();
        }
      },
    });

    // Handle client disconnect
    response.on('close', () => {
      this.logger.debug(
        'Client disconnected from log stream',
        'LogsController',
      );
      subscription.unsubscribe();
    });
  }

  @Post()
  createLog(
    @Body('level') level: number,
    @Body('message') message: LogEntry['message'],
    @Body('context') context?: string,
  ): void {
    this.logger.log(message, level, context);
    this.logger.debug(
      `Log created: level=${level}, context=${context || 'none'}`,
      'LogsController',
    );
  }

  // This route should come AFTER all other named routes
  /*
  @Get(':id')
  getLogById(@Param('id') id: string): Observable<LogEntry> {
    this.logger.debug(`Received request to get log with id: ${id}`, 'LogsController');
    return this.logger.getLogById(id).pipe();
  }
  */

  private buildLogFilter(
    level?: string,
    maxLevel?: string,
    context?: string,
    pattern?: string,
    fromDate?: string,
    toDate?: string,
  ): LogFilter {
    const filter: LogFilter = {};

    // Parse min level
    if (level !== undefined) {
      filter.minLevel = parseInt(level, 10);
    } else {
      filter.minLevel = LogLevel.DEBUG;
    }

    // Parse max level
    if (maxLevel !== undefined && maxLevel !== '') {
      filter.maxLevel = parseInt(maxLevel, 10);
    }

    // Parse context filter
    if (context) {
      filter.contexts = [context];
    }

    // Parse date range
    if (fromDate) {
      filter.fromDate = new Date(fromDate);
    }
    if (toDate) {
      filter.toDate = new Date(toDate);
    }

    // Parse message pattern
    if (pattern) {
      filter.messagePattern = new RegExp(pattern);
    }

    return filter;
  }
}
