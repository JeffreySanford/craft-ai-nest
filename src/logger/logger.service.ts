import { Injectable } from '@nestjs/common';
import { Subject, Observable, from, throwError } from 'rxjs';
import { filter, share, shareReplay, map, catchError } from 'rxjs/operators';
import { randomUUID } from 'crypto';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { LogEntry as LogEntryDocument, LogSchema } from './logger.schema';
import { WinstonLoggingService } from '../winston/winston-logging.service';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  LOG = 2,
  WARN = 3,
  ERROR = 4,
}

export interface LogEntry {
  id?: string;
  message: string | number | object | Error | null | undefined;
  context?: string;
  level: LogLevel;
  timestamp: Date;
  additionalInfo?: unknown;
  isAudit?: boolean; // Flag to mark entries for the audit trail
  // New fields for compliance tracking
  userId?: string;
  sessionId?: string;
  origin?: string;
  resourceId?: string;
  action?: string;
  status?: 'success' | 'failure' | 'attempted';
}

export interface LogFilter {
  minLevel?: LogLevel;
  maxLevel?: LogLevel;
  contexts?: string[];
  messagePattern?: RegExp;
  fromDate?: Date;
  toDate?: Date;
}

@Injectable()
export class LoggerService {
  private logSubject = new Subject<LogEntry>();
  private logObservable: Observable<LogEntry>;
  private logModel: Model<LogEntryDocument>;
  private logMap = new Map<string, LogEntry>();

  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly winstonLogger: WinstonLoggingService,
  ) {
    // Create a shared hot observable from the subject
    this.logObservable = this.logSubject.pipe(share());

    // Initialize the MongoDB model for logs
    this.logModel = this.connection.model('Log', LogSchema);

    // Store logs in MongoDB and forward to console
    this.logObservable.subscribe((entry) => {
      const logWithId = { ...entry, id: entry.id || randomUUID() };

      // Save the log to MongoDB
      this.logModel.create(logWithId).catch((err) => {
        // Use direct console.error since we are the logger service
        console.error('Failed to save log to MongoDB:', err);
      });

      // Forward to Winston
      const messageStr = this.formatMessage(logWithId.message ?? '');
      const context = logWithId.context || '';

      // Forward to Winston logger
      this.winstonLogger.logWithLevel(logWithId.level, messageStr, context, {
        additionalInfo: logWithId.additionalInfo,
      });
    });
  }

  // Helper to format messages of any type to string
  private formatMessage(message: string | number | object | Error): string {
    if (message === null || message === undefined) {
      return typeof message === 'object'
        ? JSON.stringify(message, null, 2)
        : String(message);
    }

    if (typeof message === 'string') {
      return message;
    }

    if (message instanceof Error) {
      return `${message.message}\n${message.stack || ''}`;
    }

    // Try to handle objects, arrays etc.
    try {
      return typeof message === 'object'
        ? JSON.stringify(message, null, 2)
        : String(message);
    } catch {
      return typeof message === 'object'
        ? JSON.stringify(message, null, 2)
        : String(message);
    }
  }

  debug<T extends string | object | Error>(
    message: T,
    context?: string,
    additionalInfo?: unknown,
  ): void {
    this.log(message, LogLevel.DEBUG, context, additionalInfo);
  }

  info<T extends string | object | Error>(
    message: T,
    context?: string,
    additionalInfo?: unknown,
  ): void {
    this.log(message, LogLevel.INFO, context, additionalInfo);
  }

  log<T extends string | object | Error | number | null | undefined>(
    message: T,
    level: LogLevel = LogLevel.LOG,
    context?: string,
    additionalInfo?: unknown,
  ): void {
    this.logSubject.next({
      message,
      level,
      context,
      additionalInfo,
      timestamp: new Date(),
    });
  }

  warn<T extends string | object | Error>(
    message: T,
    context?: string,
    additionalInfo?: unknown,
  ): void {
    this.log(message, LogLevel.WARN, context, additionalInfo);
  }

  error<T extends string | object | Error>(
    message: T,
    context?: string,
    additionalInfo?: unknown,
  ): void {
    this.log(message, LogLevel.ERROR, context, additionalInfo);
  }

  // Enhanced audit method with compliance tracking fields
  audit<T extends string | object | Error>(
    message: T,
    level: LogLevel = LogLevel.INFO,
    context?: string,
    complianceInfo?: {
      userId?: string;
      sessionId?: string;
      origin?: string;
      resourceId?: string;
      action?: string;
      status?: 'success' | 'failure' | 'attempted';
    },
    additionalInfo?: unknown,
  ): void {
    this.logSubject.next({
      message,
      level,
      context,
      additionalInfo,
      timestamp: new Date(),
      isAudit: true, // Mark as an audit log entry
      // Add compliance tracking information
      userId: complianceInfo?.userId,
      sessionId: complianceInfo?.sessionId,
      origin: complianceInfo?.origin,
      resourceId: complianceInfo?.resourceId,
      action: complianceInfo?.action,
      status: complianceInfo?.status,
    });
  }

  /**
   * Check if log entry passes the filter conditions
   */
  private passesFilter(entry: LogEntry, filter?: LogFilter): boolean {
    // If no filter provided, everything passes
    if (!filter) {
      return true;
    }

    // Check minimum level
    if (filter.minLevel !== undefined && entry.level < filter.minLevel) {
      return false;
    }

    // Check maximum level
    if (filter.maxLevel !== undefined && entry.level > filter.maxLevel) {
      return false;
    }

    // Check contexts
    if (
      filter.contexts?.length &&
      (!entry.context || !filter.contexts.includes(entry.context))
    ) {
      return false;
    }

    // Check message pattern
    if (
      filter.messagePattern &&
      (!entry.message ||
        !filter.messagePattern.test(this.formatMessage(entry.message)))
    ) {
      return false;
    }

    // Check date range
    const timestamp = entry.timestamp.getTime();
    if (filter.fromDate && timestamp < filter.fromDate.getTime()) {
      return false;
    }
    if (filter.toDate && timestamp > filter.toDate.getTime()) {
      return false;
    }

    return true;
  }

  /**
   * Get an observable filtered by log level and other criteria
   * @param filterOrMinLevel LogFilter object or just minLevel for backward compatibility
   */
  getLogStream(filterOrMinLevel?: LogFilter | LogLevel): Observable<LogEntry> {
    // Convert simple minLevel to filter object for backward compatibility
    const logFilter: LogFilter =
      filterOrMinLevel !== undefined && typeof filterOrMinLevel === 'object'
        ? filterOrMinLevel
        : { minLevel: filterOrMinLevel };

    return this.logObservable.pipe(
      filter((entry) => this.passesFilter(entry, logFilter)),
    );
  }

  /**
   * Get all stored logs from MongoDB with filtering
   */
  getAllLogs(filterOrMinLevel?: LogFilter | LogLevel): Observable<LogEntry[]> {
    const logFilter: LogFilter =
      filterOrMinLevel !== undefined && typeof filterOrMinLevel === 'object'
        ? filterOrMinLevel
        : { minLevel: filterOrMinLevel };

    const query: Record<string, unknown> = {};

    // Apply filters to the MongoDB query
    if (logFilter.minLevel !== undefined) {
      query['level'] = { $gte: logFilter.minLevel };
    }
    if (logFilter.maxLevel !== undefined) {
      query['level'] = {
        ...(query['level'] as { $gte?: LogLevel; $lte?: LogLevel }),
        $lte: logFilter.maxLevel,
      };
    }
    if (logFilter.contexts?.length) {
      query['context'] = { $in: logFilter.contexts };
    }
    if (logFilter.messagePattern) {
      query['message'] = { $regex: logFilter.messagePattern, $options: 'i' };
    }
    if (logFilter.fromDate || logFilter.toDate) {
      query['timestamp'] = {};
      if (logFilter.fromDate || logFilter.toDate) {
        query['timestamp'] = {};
        if (logFilter.fromDate) {
          query['timestamp'] =
            (query['timestamp'] as { $gte?: Date; $lte?: Date }) || {};
          (query['timestamp'] as { $gte?: Date }).$gte = logFilter.fromDate;
        }
        if (logFilter.toDate) {
          query['timestamp'] =
            (query['timestamp'] as { $gte?: Date; $lte?: Date }) || {};
          (query['timestamp'] as { $lte?: Date }).$lte = logFilter.toDate;
        }
      }
    }

    // Ensure the function always returns an Observable
    return from(this.logModel.find(query).sort({ timestamp: -1 }).exec()).pipe(
      map((documents) => documents.map((doc) => doc.toObject() as LogEntry)),
      shareReplay(1),
    );
  }

  createFilter(options: LogFilter): LogFilter {
    return { ...options };
  }

  // Add this method to the LoggerService class
  getLogById(id: string): Observable<LogEntry> {
    return from(this.logModel.findOne({ id }).exec()).pipe(
      map((doc) => {
        if (!doc) {
          throw new Error(`Log with id ${id} not found`);
        }
        return doc.toObject() as LogEntry;
      }),
      catchError((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        this.error(
          `Failed to retrieve log by id ${id}: ${message}`,
          'LoggerService',
          error,
        );
        return throwError(() => error);
      }),
    );
  }
}
