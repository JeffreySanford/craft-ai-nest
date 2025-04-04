import { Injectable } from '@nestjs/common';
import * as winston from 'winston';
import { LogLevel } from '../logger/logger.service';

@Injectable()
export class WinstonLoggingService {
  private readonly logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
          ),
        }),
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
        }),
        new winston.transports.File({
          filename: 'logs/combined.log',
          level: 'info',
        }),
        new winston.transports.File({
          filename: 'logs/audit.log',
        }),
      ],
    });
  }

  log(message: string, context?: string, meta?: Record<string, unknown>): void {
    this.logger.info(message, { context, ...meta });
  }

  error(
    message: string,
    context?: string,
    meta?: Record<string, unknown>,
  ): void {
    this.logger.error(message, { context, ...meta });
  }

  warn(
    message: string,
    context?: string,
    meta?: Record<string, unknown>,
  ): void {
    this.logger.warn(message, { context, ...meta });
  }

  debug(
    message: string,
    context?: string,
    meta?: Record<string, unknown>,
  ): void {
    this.logger.debug(message, { context, ...meta });
  }

  // Map LogLevel enum to Winston levels
  logWithLevel(
    level: LogLevel,
    message: string,
    context?: string,
    meta?: Record<string, unknown>,
  ): void {
    const winstonLevel = this.mapLogLevel(level);
    this.logger.log(winstonLevel, message, { context, ...meta });
  }

  private mapLogLevel(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return 'debug';
      case LogLevel.INFO:
        return 'info';
      case LogLevel.LOG:
        return 'info';
      case LogLevel.WARN:
        return 'warn';
      case LogLevel.ERROR:
        return 'error';
      default:
        return 'info';
    }
  }
}
