import { Module } from '@nestjs/common';
import { GraphicsService } from './graphics.service';
import { GraphicsResolver } from './graphics.resolver';
import { GraphicsController } from './graphics.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { LoggerModule } from '../logger/logger.module';

@Module({
  imports: [MongooseModule, LoggerModule],
  providers: [GraphicsService, GraphicsResolver],
  controllers: [GraphicsController],
  exports: [GraphicsService],
})
export class GraphicsModule {}
