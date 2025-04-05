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

  @Get('level-test')
  async getLogLevelTestPage(@Res() res: Response): Promise<void> {
    this.logger.debug('Serving log level test page', 'LogsController');
    
    try {
      // Render the level-test template from file
      const html = await this.templateService.render('logs/level-test.html', {});
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
      this.logger.debug('Log level test page served successfully', 'LogsController');
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
          );mber | string,
        }
      },
      complete: () => {
        this.logger.debug('Log stream completed normally', 'LogsController');
        if (response.writable) {
          response.end();
        }ut === 'string') {
      },// Try to convert string level names to numbers
    });   switch (levelInput.toUpperCase()) {
        case 'DEBUG': level = LogLevel.DEBUG; break;
    // Handle client disconnect
    response.on('close', () => {    case 'LOG': level = LogLevel.LOG; break;
      this.logger.debug('WARN': level = LogLevel.WARN; break;
        'Client disconnected from log stream',
        'LogsController',
      );
      subscription.unsubscribe();       level = parseInt(levelInput, 10);
    });      if (isNaN(level)) level = LogLevel.INFO; // Default
  }          break;

  @Post()
  createLog(ut as number;
    @Body('level') level: number,
    @Body('message') message: LogEntry['message'],
    @Body('context') context?: string,ssage, level, context);
  ): void {g(
    this.logger.log(message, level, context);ed: level=${level}, context=${context || 'none'}`,
    this.logger.debug(
      `Log created: level=${level}, context=${context || 'none'}`,    );
      'LogsController',
    );
  }named routes

  // This route should come AFTER all other named routes
  /*LogById(@Param('id') id: string): Observable<LogEntry> {
  @Get(':id')    this.logger.debug(`Received request to get log with id: ${id}`, 'LogsController');
  getLogById(@Param('id') id: string): Observable<LogEntry> {.getLogById(id).pipe();
    this.logger.debug(`Received request to get log with id: ${id}`, 'LogsController');
    return this.logger.getLogById(id).pipe();
  }
  */  private buildLogFilter(

  private buildLogFilter(ing,
    level?: string,
    maxLevel?: string,attern?: string,
    context?: string,    fromDate?: string,
    pattern?: string,
    fromDate?: string,
    toDate?: string,
  ): LogFilter {
    const filter: LogFilter = {};level
= '') {
    // Parse min level filter.minLevel = parseInt(level, 10);
    if (level !== undefined) {      this.logger.debug(`Using min log level filter: ${filter.minLevel}`, 'LogsController');
      filter.minLevel = parseInt(level, 10);
    } else {vel = LogLevel.DEBUG;
      filter.minLevel = LogLevel.DEBUG;um level', 'LogsController');
    }

    // Parse max levelevel
    if (maxLevel !== undefined && maxLevel !== '') { if (maxLevel !== undefined && maxLevel !== '') {
      filter.maxLevel = parseInt(maxLevel, 10);     filter.maxLevel = parseInt(maxLevel, 10);
    }    }























}  }    return filter;    }      filter.messagePattern = new RegExp(pattern);    if (pattern) {    // Parse message pattern    }      filter.toDate = new Date(toDate);    if (toDate) {    }      filter.fromDate = new Date(fromDate);    if (fromDate) {    // Parse date range    }      filter.contexts = [context];    if (context) {    // Parse context filter
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
