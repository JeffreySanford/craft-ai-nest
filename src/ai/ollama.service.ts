import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { Ollama } from '@langchain/ollama';
import { Observable, defer, throwError } from 'rxjs';
import { shareReplay, catchError, tap } from 'rxjs/operators';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class OllamaService {
  private readonly model: Ollama;
  private readonly CONTEXT = 'OllamaService';

  constructor(private readonly logger: LoggerService) {
    this.logger.info('Initializing OllamaService', this.CONTEXT);

    try {
      this.model = new Ollama({
        baseUrl: 'http://localhost:11434',
        model: 'codellama:13b',
      });
      this.logger.info('Ollama model initialized successfully', this.CONTEXT);
    } catch (error) {
      this.logger.error(
        `Failed to initialize Ollama model: ${error instanceof Error ? error.message : String(error)}`,
        this.CONTEXT,
        error,
      );
      throw error;
    }
  }

  invokeAI(prompt: string): Observable<string> {
    this.logger.info(
      `Received AI prompt: ${prompt.substring(0, 50)}...`,
      this.CONTEXT,
    );
    this.logger.debug(
      `Full prompt length: ${prompt.length} characters`,
      this.CONTEXT,
    );

    return defer(() => {
      this.logger.debug('Sending request to Ollama API', this.CONTEXT);
      return this.model.invoke(prompt);
    }).pipe(
      tap((response: string) => {
        this.logger.info(
          `Ollama responded with ${response.length} characters`,
          this.CONTEXT,
        );
        this.logger.debug(
          `Response preview: ${response.substring(0, 100)}...`,
          this.CONTEXT,
        );
      }),
      catchError((err: Error): Observable<string> => {
        this.logger.error(
          `Ollama invocation error: ${err.message}`,
          this.CONTEXT,
          err.stack,
        );
        return throwError(
          () =>
            new HttpException(
              'Ollama invocation failed',
              HttpStatus.INTERNAL_SERVER_ERROR,
            ),
        );
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
  }
}
