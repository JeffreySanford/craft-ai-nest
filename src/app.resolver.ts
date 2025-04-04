import { Resolver, Query, Args } from '@nestjs/graphql';
import { OllamaService } from './ai/ollama.service';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LoggerService } from './logger/logger.service';

@Resolver()
export class AiResolver {
  private readonly CONTEXT = 'AiResolver';

  constructor(
    private readonly ollamaService: OllamaService,
    private readonly logger: LoggerService,
  ) {
    this.logger.info('Initializing AiResolver', this.CONTEXT);
  }

  @Query(() => String)
  askAI(@Args('prompt') prompt: string): Observable<string> {
    this.logger.info(
      `GraphQL query: askAI received with prompt length: ${prompt.length}`,
      this.CONTEXT,
    );
    this.logger.debug(
      `Prompt preview: ${prompt.substring(0, 50)}...`,
      this.CONTEXT,
    );

    return this.ollamaService.invokeAI(prompt).pipe(
      tap(
        // On success
        (response) => {
          this.logger.info(
            `AI response successfully generated (${response.length} chars)`,
            this.CONTEXT,
          );
        },
        // On error
        (error) => {
          this.logger.error(
            `Error processing AI request: ${error instanceof Error ? error.message : String(error)}`,
            this.CONTEXT,
            error,
          );
        },
        // On complete
        () => {
          this.logger.debug('AI request completed', this.CONTEXT);
        },
      ),
    );
  }
}
