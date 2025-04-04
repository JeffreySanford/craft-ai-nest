import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { from } from 'rxjs';
import { switchMap, tap, catchError } from 'rxjs/operators';
import { Logger } from '@nestjs/common';
import { LoggerService } from './logger/logger.service';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

const CONTEXT = 'Bootstrap';

function bootstrap() {
  const logger = new Logger(CONTEXT);

  from(NestFactory.create<NestExpressApplication>(AppModule))
    .pipe(
      tap((app) => {
        // Serve static assets (including viewer.js) from src/views
        app.useStaticAssets(join(process.cwd(), 'src', 'views'));

        const appLogger = app.get(LoggerService);
        appLogger.info('NestJS application created successfully', CONTEXT);
        appLogger.debug(
          `Environment: ${process.env.NODE_ENV || 'development'}`,
          CONTEXT,
        );
      }),
      switchMap((app) => {
        const port = process.env.PORT ?? 3000;
        const appLogger = app.get(LoggerService);
        appLogger.info(`Starting application on port ${port}`, CONTEXT);
        return from(app.listen(port)).pipe(
          tap(() => {
            appLogger.info(
              `Application successfully started on port ${port}`,
              CONTEXT,
            );
            appLogger.debug(
              `Server running at http://localhost:${port}/`,
              CONTEXT,
            );
            appLogger.debug(
              `GraphQL playground available at http://localhost:${port}/graphql`,
              CONTEXT,
            );
          }),
        );
      }),
      catchError((error: Error) => {
        logger.error('Failed to start application', error.stack);
        process.exit(1);
        throw error; // This will never be reached due to process.exit
      }),
    )
    .subscribe();
}

bootstrap();
