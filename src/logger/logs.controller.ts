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
  Param,
} from '@nestjs/common';
import { LoggerService, LogLevel, LogEntry, LogFilter } from './logger.service';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Response } from 'express';
import { TemplateService } from '../shared/templates/template.service';
import { ApiTags, ApiOperation, ApiQuery, ApiParam, ApiResponse, ApiBody } from '@nestjs/swagger';

@ApiTags('logs')
@Controller('logs')
export class LogsController {
  constructor(
    private readonly logger: LoggerService,
    private readonly templateService: TemplateService,
  ) {}

  // This method needs to be BEFORE the :id route to ensure proper route matching
  @Get()
  @ApiOperation({ summary: 'Get all logs with optional filtering' })
  @ApiQuery({ name: 'level', required: false, description: 'Minimum log level (0=DEBUG to 4=ERROR)' })
  @ApiQuery({ name: 'maxLevel', required: false, description: 'Maximum log level' })
  @ApiQuery({ name: 'context', required: false, description: 'Context filter' })
  @ApiQuery({ name: 'from', required: false, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'to', required: false, description: 'End date (ISO format)' })
  @ApiQuery({ name: 'pattern', required: false, description: 'Text search pattern' })
  @ApiResponse({ status: 200, description: 'Returns filtered logs' })
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

  @Get('level-test')
  async getLogLevelTestPage(@Res() res: Response): Promise<void> {
    this.logger.debug('Serving log level test page', 'LogsController');

    try {
      // Render the level-test template from file
      const html = await this.templateService.render(
        'logs/level-test.html',
        {},
      );
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
      this.logger.debug(
        'Log level test page served successfully',
        'LogsController',
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to serve log level test page: ${message}`,
        'LogsController',
        error,
      );
      res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .send('Error loading log level test page');
    }
  }

  @Get('stream')
  @Header('Content-Type', 'text/event-stream')
  @Header('Cache-Control', 'no-cache')
  @Header('Connection', 'keep-alive')
  @ApiOperation({ summary: 'Stream logs in real-time using SSE' })
  @ApiQuery({ name: 'level', required: false, description: 'Minimum log level' })
  @ApiQuery({ name: 'maxLevel', required: false, description: 'Maximum log level' })
  @ApiQuery({ name: 'context', required: false, description: 'Context filter' })
  @ApiQuery({ name: 'pattern', required: false, description: 'Text search pattern' })
  @ApiResponse({ status: 200, description: 'Returns Server-Sent Events stream' })
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
  @ApiOperation({ summary: 'Create a new log entry' })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        level: { 
          oneOf: [
            { type: 'number', description: 'Log level number (0-4)' },
            { type: 'string', enum: ['DEBUG', 'INFO', 'LOG', 'WARN', 'ERROR'], description: 'Log level name' }
          ]
        },
        message: { 
          oneOf: [
            { type: 'string' },
            { type: 'object', description: 'Complex message object' }
          ],
          description: 'Log message content'
        },
        context: { type: 'string', description: 'Log context name' }
      },
      required: ['message', 'level']
    }
  })
  @ApiResponse({ status: 201, description: 'Log created successfully' })
  createLog(
    @Body('level') levelInput: number | string,
    @Body('message') message: LogEntry['message'],
    @Body('context') context?: string,
  ): void {
    // Ensure level is a number
    let level: number;

    if (typeof levelInput === 'string') {
      // Try to convert string level names to numbers
      switch (levelInput.toUpperCase()) {
        case 'DEBUG':
          level = LogLevel.DEBUG;
          break;
        case 'INFO':
          level = LogLevel.INFO;
          break;
        case 'LOG':
          level = LogLevel.LOG;
          break;
        case 'WARN':
          level = LogLevel.WARN;
          break;
        case 'ERROR':
          level = LogLevel.ERROR;
          break;
        default:
          // Try parsing as a number
          level = parseInt(levelInput, 10);
          if (isNaN(level)) {
            level = LogLevel.INFO; // Default
          }
          break;
      }
    } else {
      level = levelInput;
    }

    this.logger.log(message, level, context);
    this.logger.debug(
      `Log created: level=${level}, context=${context || 'none'}`,
      'LogsController',
    );
  }

  // This route should come AFTER all other named routes
  @Get(':id')
  @ApiOperation({ summary: 'Get log by ID' })
  @ApiParam({ name: 'id', description: 'Log entry ID' })
  @ApiResponse({ status: 200, description: 'Returns the log entry' })
  @ApiResponse({ status: 404, description: 'Log not found' })
  getLogById(@Param('id') id: string): Observable<LogEntry> {
    this.logger.debug(
      `Received request to get log with id: ${id}`,
      'LogsController',
    );
    return this.logger.getLogById(id);
  }

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
    if (level !== undefined && level !== '') {
      filter.minLevel = parseInt(level, 10);
      this.logger.debug(
        `Using min log level filter: ${filter.minLevel}`,
        'LogsController',
      );
    } else {
      filter.minLevel = LogLevel.DEBUG;
      this.logger.debug('Using default DEBUG minimum level', 'LogsController');
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
