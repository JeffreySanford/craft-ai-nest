import { Test, TestingModule } from '@nestjs/testing';
import { LogsController } from './logs.controller';
import { LoggerService, LogLevel, LogEntry } from './logger.service';
import { of, throwError, lastValueFrom, firstValueFrom } from 'rxjs';
import { HttpException, HttpStatus } from '@nestjs/common';
import { tap } from 'rxjs/operators';
import { TemplateService } from '../shared/templates/template.service';

describe('LogsController', () => {
  let controller: LogsController;

  const mockLoggerService = {
    getAllLogs: jest.fn(),
    log: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  };

  const mockTemplateService = {
    render: jest.fn().mockResolvedValue('<html>Mocked HTML</html>'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LogsController],
      providers: [
        { provide: LoggerService, useValue: mockLoggerService },
        { provide: TemplateService, useValue: mockTemplateService },
      ],
    }).compile();

    controller = module.get<LogsController>(LogsController);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAllLogs', () => {
    it('should return all logs with default level', async () => {
      const mockLogs: LogEntry[] = [
        {
          id: '1',
          message: 'Test log',
          level: LogLevel.INFO,
          timestamp: new Date(),
        },
      ];

      mockLoggerService.getAllLogs.mockReturnValue(of(mockLogs));

      const logs = await lastValueFrom(
        controller.getAllLogs().pipe(
          tap((logs) => {
            expect(logs).toEqual(mockLogs);
            expect(mockLoggerService.getAllLogs).toHaveBeenCalledWith({
              minLevel: LogLevel.DEBUG,
            });
            expect(mockLoggerService.debug).toHaveBeenCalledTimes(2);
          }),
        ),
      );

      expect(logs).toBe(mockLogs);
    });

    it('should filter logs by level', async () => {
      const mockLogs: LogEntry[] = [
        {
          id: '1',
          message: 'Test error log',
          level: LogLevel.ERROR,
          timestamp: new Date(),
        },
      ];

      mockLoggerService.getAllLogs.mockReturnValue(of(mockLogs));

      const result = await firstValueFrom(
        controller.getAllLogs('3').pipe(
          tap((logs) => {
            expect(logs).toEqual(mockLogs);
            expect(mockLoggerService.getAllLogs).toHaveBeenCalledWith({
              minLevel: LogLevel.WARN,
            });
          }),
        ),
      );

      expect(result).toEqual(mockLogs);
    });

    it('should handle errors', async () => {
      mockLoggerService.getAllLogs.mockReturnValue(
        throwError(() => new Error('Test error')),
      );

      try {
        await lastValueFrom(controller.getAllLogs());
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
        expect(mockLoggerService.error).toHaveBeenCalled();
      }
    });
  });
});
