import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import type { Application } from 'express';
import * as request from 'supertest';
import { join } from 'path';
import * as fs from 'fs';
import { MongooseModule } from '@nestjs/mongoose';
import { GraphicsModule } from './graphics.module';
import { LoggerModule } from '../logger/logger.module';
import { LogLevel, LogEntry } from '../logger/logger.service';
import { Response, Request } from 'express';
import { GraphicsController } from './graphics.controller';
import { GraphicsService } from './graphics.service';
import { LoggerService } from '../logger/logger.service';
import { of, throwError } from 'rxjs';
import { Connection } from 'mongoose';
import {
  from,
  Observable,
  defer,
  lastValueFrom,
  timeout,
  firstValueFrom,
} from 'rxjs';
import {
  shareReplay,
  catchError,
  take,
  switchMap,
  map,
  tap,
  filter,
  concatMap,
  timeoutWith,
  delay,
} from 'rxjs/operators';

interface UploadResponse {
  id: string;
}

// Extend the Supertest Response type with a strongly-typed body.
interface TypedResponse<T = unknown> extends request.Response {
  body: T;
}

// Create a type for mock requests to fix unsafe arguments
interface MockRequest {
  headers: Record<string, string>;
  ip?: string;
}

describe('GraphicsController (e2e) - Hot Observable Based', () => {
  let app: INestApplication;
  let loggerService: LoggerService;
  const TEST_IMAGE_PATH = join(
    __dirname,
    '..',
    '..',
    'test',
    'fixtures',
    'test-image.png',
  );

  // Create test fixtures directory if it doesn't exist
  beforeAll(async (): Promise<void> => {
    const fixturesDir = join(__dirname, '..', '..', 'test', 'fixtures');

    // Ensure the fixtures directory exists
    if (!fs.existsSync(fixturesDir)) {
      fs.mkdirSync(fixturesDir, { recursive: true });
    }

    // Create a test image if it doesn't exist
    if (!fs.existsSync(TEST_IMAGE_PATH)) {
      // Create a simple test PNG image (1x1 pixel)
      const testImageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64',
      );
      fs.writeFileSync(TEST_IMAGE_PATH, testImageBuffer);
    }

    // Setup test module with both Graphics and Logger modules
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        GraphicsModule,
        LoggerModule,
        // Connect to a dedicated test database
        MongooseModule.forRoot('mongodb://localhost:27017/truenorth-test'),
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    loggerService = app.get<LoggerService>(LoggerService);
    await app.init();
  });

  // Helper function to create observable for requests
  function createRequest<T>(
    requestFn: () => Promise<request.Response>,
  ): Observable<TypedResponse<T>> {
    return from(requestFn()).pipe(
      catchError((err: unknown) => throwError(() => new Error(String(err)))),
      shareReplay({ bufferSize: 1, refCount: true }),
    ) as Observable<TypedResponse<T>>;
  }

  // Helper function to wait for and capture logs as an observable with better message matching
  function waitForLog$(
    level: LogLevel,
    context: string,
    messagePattern?: RegExp,
    timeoutMs = 60000, // Increased timeout to 60 seconds
  ): Observable<LogEntry> {
    const allLogs: LogEntry[] = [];

    return of(null).pipe(
      delay(100), // Small delay before subscribing
      switchMap(() => loggerService.getLogStream(level)),
      tap((log: LogEntry) => {
        allLogs.push(log);
        // Use logger.debug here instead of console.log
        loggerService.debug(
          `Received log: [${LogLevel[log.level]}] [${log.context}] ${
            typeof log.message === 'object'
              ? JSON.stringify(log.message)
              : String(log.message)
          }`,
          'TestHelper',
        );
      }),
      filter((log) => log.context === context),
      filter((log) => {
        if (!messagePattern) {
          return true;
        }
        const messageStr =
          typeof log.message === 'string'
            ? log.message
            : JSON.stringify(log.message);
        return messagePattern.test(messageStr);
      }),
      take(1),
      timeoutWith(
        timeoutMs,
        throwError(() => {
          const receivedLogs = allLogs
            .filter((log) => log.context === context)
            .map((log) => {
              const message =
                typeof log.message === 'string'
                  ? log.message
                  : JSON.stringify(log.message);
              return `- [${LogLevel[log.level]}] ${message}`;
            })
            .join('\n');

          return new Error(
            `Timed out waiting for log with pattern ${messagePattern} in context ${context}\n` +
              `Received logs for this context:\n${receivedLogs || 'None'}`,
          );
        }),
      ),
    );
  }

  it('POST /graphics should upload a file and log operations', async () => {
    const expressApp = app.getHttpServer() as unknown as Application;

    // Log a test marker to ensure the logger is working
    loggerService.info('Starting upload test', 'TestMarker');

    // Create upload request observable
    const upload$ = createRequest<UploadResponse>(() =>
      request(expressApp)
        .post('/graphics')
        .attach('file', TEST_IMAGE_PATH)
        .expect(201),
    );

    // Create a sequence of observables to process the file upload flow
    const test$ = upload$.pipe(
      // Add longer timeout to prevent test from hanging
      timeout(30000),

      // Verify upload response
      tap((response) => expect(typeof response.body.id).toBe('string')),

      // Log the response ID for debugging
      tap((response) =>
        // Use logger instead of console.log
        loggerService.debug(
          `Uploaded file with ID: ${response.body.id}`,
          'Test',
        ),
      ),

      // Wait for info log and save it
      switchMap((response) =>
        waitForLog$(
          LogLevel.INFO,
          'GraphicsService',
          new RegExp(`Upload complete for graphic ID: ${response.body.id}`),
        ).pipe(
          map(() => response), // Pass response to next operator
        ),
      ),

      // Add specific error handling
      catchError((err: Error) => {
        loggerService.error('Error in test:', 'Test', err);
        return throwError(() => err);
      }),
    );

    // Execute the observable sequence with a specific timeout
    try {
      await lastValueFrom(test$);
    } catch (error) {
      loggerService.error('Test failed with error:', 'Test', error);
      throw error;
    }
  }, 60000); // Increased timeout to 60 seconds

  it('GET /graphics/:id should retrieve file and log operations', async () => {
    const expressApp = app.getHttpServer() as unknown as Application;

    // Create a complete test observable pipeline
    const test$ = defer(async () => {
      // Upload a file synchronously first to ensure we have an ID
      const uploadResponse = await firstValueFrom(
        createRequest<UploadResponse>(() =>
          request(expressApp)
            .post('/graphics')
            .attach('file', TEST_IMAGE_PATH)
            .expect(201),
        ),
      );

      // Extract and log the file ID for debugging
      const fileId = uploadResponse.body.id;
      // Use logger instead of console.log
      loggerService.debug(`Test using file ID: ${fileId}`, 'Test');

      return fileId;
    }).pipe(
      // Request the file using the ID
      concatMap((fileId) =>
        createRequest<Buffer>(() =>
          request(expressApp).get(`/graphics/${fileId}`).expect(200),
        ).pipe(
          // Verify response content type
          tap((getRes) => {
            const contentType = getRes.headers['content-type'];
            expect(contentType).toMatch(/application\/octet-stream/);
          }),

          // Wait for success log with exact file ID
          switchMap(() =>
            waitForLog$(
              LogLevel.INFO,
              'GraphicsController',
              new RegExp(`Successfully streamed graphic ${fileId}`),
              15000, // Increased timeout for log waiting
            ),
          ),

          // Test logs filtering by checking filtered logs endpoint
          switchMap((infoLog) =>
            createRequest<LogEntry[]>(() =>
              request(expressApp)
                .get('/logs?level=2') // Only LOG level and above
                .expect(200),
            ).pipe(
              tap((filteredLogsResponse) => {
                const filteredLogs = filteredLogsResponse.body;
                const foundInfoLog = filteredLogs.find(
                  (log) => log.id === infoLog.id && log.level === LogLevel.INFO,
                );
                expect(foundInfoLog).toBeDefined();
              }),
            ),
          ),
        ),
      ),
      // Add specific error handling with proper typing
      catchError((err: Error) => {
        loggerService.error('Error in GET test:', 'Test', err);
        return throwError(() => err);
      }),
    );

    // Execute the test sequence
    try {
      await lastValueFrom(test$);
    } catch (error) {
      loggerService.error('Test failed with error:', 'Test', error);
      throw error;
    }
  }, 30000); // Maintain 30s timeout

  // Ensure MongoDB connection is properly closed after tests
  afterAll(async () => {
    await app.close();
    try {
      const mongooseConnection = app.get(Connection);
      if (mongooseConnection) {
        await mongooseConnection.close();
      } else {
        loggerService.warn(
          'MongooseConnection not found, skipping close.',
          'Test',
        );
      }
    } catch (error) {
      loggerService.error('Error closing MongoDB connection:', 'Test', error);
    }
  });
});

describe('GraphicsController', () => {
  let controller: GraphicsController;
  let mockLoggerService: jest.Mocked<Partial<LoggerService>>;

  const mockGraphicsService = {
    uploadGraphic: jest.fn(),
    getGraphicStream: jest.fn(),
  };

  beforeEach(async () => {
    mockLoggerService = {
      debug: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
      audit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GraphicsController],
      providers: [
        { provide: GraphicsService, useValue: mockGraphicsService },
        { provide: LoggerService, useValue: mockLoggerService },
      ],
    }).compile();

    controller = module.get<GraphicsController>(GraphicsController);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('uploadGraphic', () => {
    it('should upload a graphic and return its ID', (done) => {
      const mockFile = {
        originalname: 'test.png',
        buffer: Buffer.from('test'),
        mimetype: 'image/png',
      };
      const mockId = '12345';
      const mockReq: MockRequest = {
        headers: {
          'x-user-id': 'testuser',
          'x-session-id': 'testsession',
          origin: 'http://localhost',
        },
      };

      mockGraphicsService.uploadGraphic.mockReturnValue(of(mockId));

      controller
        .uploadGraphic(mockFile, mockReq as unknown as Request)
        .subscribe((response) => {
          expect(response).toEqual({ id: mockId });
          expect(mockGraphicsService.uploadGraphic).toHaveBeenCalledWith(
            mockFile.originalname,
            mockFile.buffer,
            mockFile.mimetype,
          );
          expect(mockLoggerService.audit).toHaveBeenCalledTimes(2); // Verify audit logs were created
          done();
        });
    });

    it('should handle upload errors', (done) => {
      const mockFile = {
        originalname: 'test.png',
        buffer: Buffer.from('test'),
        mimetype: 'image/png',
      };
      const mockReq: MockRequest = {
        headers: {},
        ip: '127.0.0.1',
      };

      mockGraphicsService.uploadGraphic.mockReturnValue(
        throwError(() => new Error('Upload failed')),
      );

      controller
        .uploadGraphic(mockFile, mockReq as unknown as Request)
        .subscribe({
          error: (err: Error) => {
            expect(err.message).toBe('Upload failed');
            expect(mockLoggerService.audit).toHaveBeenCalledTimes(2); // Initial + error audit logs
            done();
          },
        });
    });

    it('should handle invalid files', (done) => {
      const mockInvalidFile = {}; // Missing required properties
      const mockReq: MockRequest = {
        headers: {},
        ip: '127.0.0.1',
      };

      controller
        .uploadGraphic(mockInvalidFile, mockReq as unknown as Request)
        .subscribe({
          error: (err: { status: number }) => {
            expect(err.status).toBe(HttpStatus.BAD_REQUEST);
            expect(mockLoggerService.audit).toHaveBeenCalledWith(
              expect.any(String),
              LogLevel.ERROR,
              expect.any(String),
              expect.objectContaining({
                status: 'failure',
              }),
            );
            done();
          },
        });
    });
  });

  describe('getGraphic', () => {
    it('should retrieve a graphic stream', () => {
      const mockStream = { pipe: jest.fn() };
      mockGraphicsService.getGraphicStream.mockReturnValue(of(mockStream));

      const res: Partial<Response> = {
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
        sendStatus: jest.fn(),
        json: jest.fn(),
        jsonp: jest.fn(),
        links: jest.fn(),
      };
      controller.getGraphic('12345', res as Response);

      expect(mockGraphicsService.getGraphicStream).toHaveBeenCalledWith(
        '12345',
      );
    });

    it('should handle errors when retrieving a graphic', () => {
      mockGraphicsService.getGraphicStream.mockReturnValue(
        throwError(() => new Error('Graphic not found')),
      );

      const res: Partial<Response> = {
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
        sendStatus: jest.fn(),
        json: jest.fn(),
        jsonp: jest.fn(),
        links: jest.fn(),
      };
      controller.getGraphic('12345', res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith('Error retrieving graphic');
    });
  });
});
