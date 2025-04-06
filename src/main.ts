import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { from, lastValueFrom } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { ValidationPipe } from '@nestjs/common';
import { LoggerService } from './logger/logger.service';
import {
  SwaggerModule,
  DocumentBuilder,
  SwaggerDocumentOptions,
} from '@nestjs/swagger';

const CONTEXT = 'Bootstrap';

// Create a simple console logger for bootstrap errors before app is ready
const bootstrapLogger = {
  error: (message: string, trace?: string) => {
    console.error(`[${CONTEXT}] ${message}`, trace || '');
  },
  warn: (message: string) => {
    console.warn(`[${CONTEXT}] ${message}`);
  },
};

async function bootstrap(): Promise<void> {
  try {
    // Create a single application instance
    const app = await NestFactory.create<NestExpressApplication>(AppModule);

    // Serve static assets (including viewer.js) from src/views
    app.useStaticAssets(join(process.cwd(), 'src', 'views'));

    // Add GraphQL specific validation for the schema
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        forbidUnknownValues: true,
      }),
    );

    // Get the logger service from the app
    const appLogger = app.get(LoggerService);
    appLogger.info('NestJS application created successfully', CONTEXT);
    appLogger.debug(
      `Environment: ${process.env.NODE_ENV || 'development'}`,
      CONTEXT,
    );

    // Set up Swagger documentation
    const config = new DocumentBuilder()
      .setTitle('Craft AI API')
      .setDescription('API documentation for the Craft AI application')
      .setVersion('1.0')
      .addTag('logs', 'System logs and audit trails')
      .addTag('graphics', 'File upload and retrieval operations')
      .addTag('metrics', 'System metrics collection and reporting')
      .addTag('ai', 'AI-powered services and completions')
      .addBearerAuth() // For future authentication implementation
      .build();

    const options: SwaggerDocumentOptions = {
      operationIdFactory: (controllerKey: string, methodKey: string) =>
        methodKey,
      deepScanRoutes: true,
    };

    const document = SwaggerModule.createDocument(app, config, options);

    // Set up Swagger UI at /api path
    SwaggerModule.setup('api', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
        docExpansion: 'none',
      },
      customCss: `
        .swagger-ui .topbar { display: none }
        .swagger-ui .info { margin-top: 20px }
      `,
      customSiteTitle: 'Craft AI API Documentation',
    });

    appLogger.info('Swagger documentation initialized at /api', CONTEXT);

    // Start the server with proper error handling
    const port = process.env.PORT ?? 3000;

    // Using rxjs for error handling and logging
    await lastValueFrom(
      from(app.listen(port)).pipe(
        tap(() => {
          appLogger.info(
            `Application successfully started on port ${port}`,
            CONTEXT,
          );
          appLogger.debug(
            `Server running at http://localhost:${port}/`,
            CONTEXT,
          );
          appLogger.info(
            `API documentation available at http://localhost:${port}/api`,
            CONTEXT,
          );
          appLogger.debug(
            `GraphQL playground available at http://localhost:${port}/graphql`,
            CONTEXT,
          );
        }),
        catchError((error: Error) => {
          appLogger.error(
            `Failed to start application: ${error.message}`,
            CONTEXT,
            error,
          );
          process.exit(1);
          throw error; // This will never be reached due to process.exit
        }),
      ),
    );
  } catch (error) {
    // Handle any errors during bootstrap
    const errorMessage = error instanceof Error ? error.message : String(error);
    bootstrapLogger.error(
      `Bootstrap failed: ${errorMessage}`,
      error instanceof Error ? error.stack : undefined,
    );
    process.exit(1);
  }
}

// Execute bootstrap with proper error handling
void bootstrap();
