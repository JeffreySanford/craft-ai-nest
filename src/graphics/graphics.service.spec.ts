import { Test, TestingModule } from '@nestjs/testing';
import { GraphicsService } from './graphics.service';
import { LoggerService } from '../logger/logger.service';
import { getConnectionToken } from '@nestjs/mongoose';

describe('GraphicsService', () => {
  let service: GraphicsService;

  // Create proper types for mocks
  const mockConnection = {
    db: {
      collection: jest.fn(),
    },
  };

  // Define a more specific type for the bucket
  interface MockGridFSBucket {
    openUploadStream: jest.Mock;
    openDownloadStream: jest.Mock;
    [key: string]: unknown;
  }

  const mockBucket: MockGridFSBucket = {
    openUploadStream: jest.fn(),
    openDownloadStream: jest.fn(),
  };

  const mockLoggerService = {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    audit: jest.fn(), // Add audit method
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Setup mock GridFSBucket implementation
    mockConnection.db.collection.mockImplementation(() => ({}));

    // Create a more type-safe mocking approach
    // Instead of using jest.mock which has issues with TypeScript
    // We'll create a simple local mock and cast it properly
    jest.mock('mongodb', () => {
      return {
        GridFSBucket: jest.fn().mockImplementation(() => mockBucket),
      };
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GraphicsService,
        {
          provide: getConnectionToken(),
          useValue: mockConnection,
        },
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
      ],
    }).compile();

    service = module.get<GraphicsService>(GraphicsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Add your service tests here...
});
