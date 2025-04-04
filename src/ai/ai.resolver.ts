import {
  Resolver,
  Query,
  Args,
  ObjectType,
  Field,
  Mutation,
} from '@nestjs/graphql';
import { OllamaService } from './ollama.service';
import { LoggerService } from '../logger/logger.service';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';

@ObjectType()
export class CompletionResponse {
  @Field()
  completion: string;
}

@ObjectType()
export class ErrorResponse {
  @Field()
  message: string;
}

@Resolver()
export class AiResolver {
  constructor(
    private readonly ollamaService: OllamaService,
    private readonly logger: LoggerService,
  ) {}

  @Query(() => String)
  ping(): Observable<string> {
    return of('AI system online').pipe(
      tap(() => this.logger.debug('Ping request received', 'AiResolver')),
    );
  }

  @Mutation(() => CompletionResponse)
  completePrompt(
    @Args('prompt', { type: () => String }) prompt: string,
  ): Observable<CompletionResponse> {
    this.logger.info(`Processing GraphQL AI completion request`, 'AiResolver');

    return this.ollamaService.invokeAI(prompt).pipe(
      map((completion) => ({ completion })),
      catchError((error) => {
        this.logger.error(
          `GraphQL AI completion error: ${error instanceof Error ? error.message : String(error)}`,
          'AiResolver',
          error,
        );
        return throwError(() => new Error('AI processing failed'));
      }),
    );
  }
}
