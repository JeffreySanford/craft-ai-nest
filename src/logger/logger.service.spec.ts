import { Test, TestingModule } from '@nestjs/testing';
import { LoggerService, LogLevel, LogEntry } from './logger.service';
import { take } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';

describe('LoggerService', () => {
  let service: LoggerService;

  beforeEach(async () => {
    // Mock console methods using jest.spyOn
    jest.spyOn(global.console, 'log').mockImplementation(() => {});
    jest.spyOn(global.console, 'error').mockImplementation(() => {});
    jest.spyOn(global.console, 'warn').mockImplementation(() => {});
    jest.spyOn(global.console, 'info').mockImplementation(() => {});
    jest.spyOn(global.console, 'debug').mockImplementation(() => {});

    const module: TestingModule = await Test.createTestingModule({
      providers: [LoggerService],
    }).compile();

    service = module.get<LoggerService>(LoggerService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should log messages to console by default', () => {
    service.log('test message');
    // The default level is LogLevel.LOG which uses console.log
    expect(console.log).toHaveBeenCalled();
  });

  it('should log error messages', () => {
    service.error('error message');
    expect(console.error).toHaveBeenCalled();
  });

  it('should log warning messages', () => {
    service.warn('warning message');
    expect(console.warn).toHaveBeenCalled();
  });

  it('should log info messages', () => {
    service.info('info message');
    // LogLevel.INFO uses console.info
    expect(console.info).toHaveBeenCalled();
  });

  it('should log debug messages', () => {
    service.debug('debug message');
    // LogLevel.DEBUG uses console.debug
    expect(console.debug).toHaveBeenCalled();
  });

  it('should provide observable log stream', async () => {
    const logPromise = firstValueFrom(service.getLogStream().pipe(take(1)));
    service.log('test message');
    const logEntry = await logPromise;

    expect(logEntry).toBeDefined();
    expect(logEntry.message).toBe('test message');
    expect(logEntry.level).toBe(LogLevel.LOG);
  });

  it('should filter log stream by level', async () => {
    const entries: LogEntry[] = [];

    // Subscribe to logs at ERROR level only
    service
      .getLogStream(LogLevel.ERROR)
      .pipe(take(1))
      .subscribe((entry) => {
        entries.push(entry);
      });

    // These should be filtered out
    service.log('test log');
    service.warn('test warning');

    // This should be included
    service.error('test error');

    // Wait for async processing
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(entries.length).toBe(1);
    expect(entries[0].level).toBe(LogLevel.ERROR);
    expect(entries[0].message).toBe('test error');
  });

  it('should include context in log entries', async () => {
    const logPromise = firstValueFrom(service.getLogStream().pipe(take(1)));
    service.log('test with context', LogLevel.LOG, 'TestContext');
    const logEntry = await logPromise;

    expect(logEntry.context).toBe('TestContext');
  });

  it('should include timestamp in log entries', async () => {
    const logPromise = firstValueFrom(service.getLogStream().pipe(take(1)));
    service.log('test with timestamp');
    const logEntry = await logPromise;

    expect(logEntry.timestamp).toBeInstanceOf(Date);
  });

  it('should include additional info in log entries', async () => {
    const additionalInfo = { key: 'value' };
    const logPromise = firstValueFrom(service.getLogStream().pipe(take(1)));
    service.log(
      'test with additional info',
      LogLevel.LOG,
      'TestContext',
      additionalInfo,
    );
    const logEntry = await logPromise;

    expect(logEntry.additionalInfo).toBe(additionalInfo);
  });

  it('should handle non-string message types - numbers', async () => {
    const logPromise = firstValueFrom(service.getLogStream().pipe(take(1)));
    service.log(123);
    const logEntry = await logPromise;

    expect(logEntry).toBeDefined();
    expect(logEntry.message).toBe(123);
  });

  it('should handle non-string message types - objects', async () => {
    const testObj = { foo: 'bar', nested: { value: 42 } };
    const logPromise = firstValueFrom(service.getLogStream().pipe(take(1)));
    service.log(testObj);
    const logEntry = await logPromise;

    expect(logEntry).toBeDefined();
    expect(logEntry.message).toEqual(testObj);
  });

  it('should handle non-string message types - arrays', async () => {
    const testArray = [1, 2, 'three', { four: 4 }];
    const logPromise = firstValueFrom(service.getLogStream().pipe(take(1)));
    service.log(testArray);
    const logEntry = await logPromise;

    expect(logEntry).toBeDefined();
    expect(logEntry.message).toEqual(testArray);
  });

  it('should handle non-string message types - errors', async () => {
    const testError = new Error('Test error message');
    const logPromise = firstValueFrom(service.getLogStream().pipe(take(1)));
    service.log(testError);
    const logEntry = await logPromise;

    expect(logEntry).toBeDefined();
    expect(logEntry.message).toBe(testError);
  });

  it('should handle null and undefined messages', async () => {
    const nullLogPromise = firstValueFrom(service.getLogStream().pipe(take(1)));
    service.log(null);
    const nullLogEntry = await nullLogPromise;
    expect(nullLogEntry.message).toBe(null);

    const undefinedLogPromise = firstValueFrom(
      service.getLogStream().pipe(take(1)),
    );
    service.log(undefined);
    const undefinedLogEntry = await undefinedLogPromise;
    expect(undefinedLogEntry.message).toBe(undefined);
  });

  it('should filter logs by different criteria', async () => {
    // Create logs with different contexts
    service.log('test admin log', LogLevel.LOG, 'admin');
    service.warn('test admin warning', 'admin');
    service.error('test user error', 'user');
    service.info('test user info', 'user');

    // Filter by context
    const filter = service.createFilter({
      contexts: ['admin'],
    });

    const logs = await firstValueFrom(service.getAllLogs(filter));
    expect(logs.length).toBe(2);
    expect(logs.every((log) => log.context === 'admin')).toBe(true);
  });

  it('should filter logs by level range', async () => {
    // Create logs with different levels
    service.debug('debug message', 'test');
    service.info('info message', 'test');
    service.log('log message', LogLevel.WARN, 'test');
    service.warn('warn message', 'test');
    service.error('error message', 'test');

    // Filter by level range (INFO to WARN)
    const filter = service.createFilter({
      minLevel: LogLevel.INFO,
      maxLevel: LogLevel.WARN,
    });

    const logs = await firstValueFrom(service.getAllLogs(filter));

    // Should only include INFO, LOG, and WARN
    expect(logs.length).toBe(3);
    expect(logs.some((log) => log.level === LogLevel.DEBUG)).toBe(false);
    expect(logs.some((log) => log.level === LogLevel.ERROR)).toBe(false);
  });

  it('should filter logs by message pattern', async () => {
    // Create logs with different messages
    service.log('apple message');
    service.log('banana message');
    service.log('apple banana');
    service.log('cherry');

    // Filter by message pattern
    const filter = service.createFilter({
      messagePattern: /apple/i,
    });

    const logs = await firstValueFrom(service.getAllLogs(filter));

    // Should only include messages with 'apple'
    expect(logs.length).toBe(2);
    expect(
      logs.every(
        (log) =>
          typeof log.message === 'string' && log.message.includes('apple'),
      ),
    ).toBe(true);
  });
});
