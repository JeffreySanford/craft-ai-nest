import { Module } from '@nestjs/common';
import { OllamaService } from './ollama.service';
import { OllamaController } from './ollama.controller';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { AiResolver } from './ai.resolver';
import { SchemaResolver } from './schema.resolver';
import { LoggerModule } from '../logger/logger.module';
import { join } from 'path';

@Module({
  imports: [
    LoggerModule,
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      playground: true, // Enable playground for debugging
      formatError: (error) => {
        console.error('GraphQL Error:', error);
        return error;
      },
    }),
  ],
  controllers: [OllamaController],
  providers: [OllamaService, AiResolver, SchemaResolver],
  exports: [OllamaService],
})
export class AiModule {}
