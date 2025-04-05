import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { ServeStaticModule } from '@nestjs/serve-static';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AiResolver } from './app.resolver';
import { MongooseModule } from '@nestjs/mongoose';
import { OllamaService } from './ai/ollama.service';
import { GraphicsModule } from './graphics/graphics.module';
import { LoggerModule } from './logger/logger.module';
import { MetricsModule } from './metrics/metrics.module';

@Module({
  imports: [
    MetricsModule,
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      playground: true,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'src', 'views'),
      serveRoot: '/',
      serveStaticOptions: {
        index: false, // Don't serve index.html by default
        extensions: ['html', 'css', 'js', 'ts'], // Add support for TypeScript files
        // Fix for Express version compatibility
        fallthrough: true,
        etag: true,
      },
    }),
    MongooseModule.forRoot('mongodb://localhost:27017/craft-ai-nest'),
    MongooseModule.forFeature([]),
    GraphicsModule,
    LoggerModule,
  ],
  controllers: [AppController],
  providers: [AppService, AiResolver, OllamaService],
})
export class AppModule {}
