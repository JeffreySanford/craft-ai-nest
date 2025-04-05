import { Test, TestingModule } from '@nestjs/testing';
import { MetricsGateway } from './metrics.gateway';
import { MetricsService } from './metrics.service';
import { LoggerService } from '../logger/logger.service';
import { Observable } from 'rxjs';
import { MetricType, MetricFilter, Metric } from './metrics.types';
import { Server } from 'socket.io';

// Define a properly typed interface for our mock socket that matches the Socket interface used in gateway
interface EventHandler {
  (data: unknown): void;
}

// Mock Socket for testing
class MockSocket {
  id = 'test-socket-id';
  connected = true;
  handlers: Record<string, EventHandler> = {};

  emit<T extends string>(_event: T, ..._args: unknown[]): boolean {
    return true;
  }

  on(event: string, handler: EventHandler): MockSocket {
    this.handlers[event] = handler;
    return this;
  }

  disconnect(): void {
    this.connected = false;
  }
}

// Type guard to ensure mock socket can be used where Socket is expected
function isMockSocketCompatible(
  socket: MockSocket,
): socket is MockSocket & { id: string; connected: boolean } {
  return typeof socket.id === 'string' && typeof socket.connected === 'boolean';
}

describe('MetricsGateway', () => {
  let gateway: MetricsGateway;
  let metricsService: jest.Mocked<Partial<MetricsService>>;
  let loggerService: jest.Mocked<Partial<LoggerService>>;

  beforeEach(async () => {
    // Create mocks
    metricsService = {
      getMetricStream: jest.fn(),
      getAllMetrics: jest.fn(),
    };

    loggerService = {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricsGateway,
        { provide: MetricsService, useValue: metricsService },
        { provide: LoggerService, useValue: loggerService },
      ],
    }).compile();

    gateway = module.get<MetricsGateway>(MetricsGateway);

    // Mock the WebSocket server with proper typing
    const mockServer: Partial<Server> = {
      on: jest.fn(),
    };

    // Safer assignment without accessing private property directly
    Object.defineProperty(gateway, 'server', {
      value: mockServer,
      writable: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleConnection', () => {
    it('should log when a client connects', () => {
      const mockSocket = new MockSocket();

      // Verify socket compatibility and use it
      if (isMockSocketCompatible(mockSocket)) {
        gateway.handleConnection(
          mockSocket as unknown as Parameters<
            typeof gateway.handleConnection
          >[0],
        );

        expect(loggerService.info).toHaveBeenCalledWith(
          expect.stringContaining('Client connected'),
          'MetricsGateway',
        );
      }
    });
  });

  describe('handleSubscribe', () => {
    it('should subscribe client to metrics stream', () => {
      // Create mock metric stream
      const mockMetric: Metric = {
        timestamp: new Date(),
        type: MetricType.CPU,
        value: 50,
        unit: '%',
      };

      const mockMetricStream = new Observable<Metric>((observer) => {
        observer.next(mockMetric);
        return () => {}; // Cleanup function
      });

      metricsService.getMetricStream = jest
        .fn()
        .mockReturnValue(mockMetricStream);

      // Setup socket and filter
      const mockSocket = new MockSocket();
      const filter: MetricFilter = {
        types: [MetricType.CPU],
      };

      // Mock emit to capture emitted values
      const emitSpy = jest.spyOn(mockSocket, 'emit');

      // Call the method with properly typed assertion
      if (isMockSocketCompatible(mockSocket)) {
        gateway.handleSubscribe(
          mockSocket as unknown as Parameters<
            typeof gateway.handleSubscribe
          >[0],
          filter,
        );

        // Verify service was called with filter
        expect(metricsService.getMetricStream).toHaveBeenCalledWith(filter);

        // Verify client received subscribed message
        expect(emitSpy).toHaveBeenCalledWith(
          'subscribed',
          expect.objectContaining({
            message: expect.stringContaining('') as string, // Ensures the message is a string
            filter,
          }),
        );

        // Verify logger called
        expect(loggerService.debug).toHaveBeenCalledWith(
          expect.stringContaining('subscribing to metrics'),
          'MetricsGateway',
        );
      }
    });
  });

  // Add more test cases for other methods
});
