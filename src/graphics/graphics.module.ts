import { Module } from '@nestjs/common';
import { GraphicsService } from './graphics.service';
import { GraphicsResolver } from './graphics.resolver';
import { GraphicsController } from './graphics.controller';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [MongooseModule],
  providers: [GraphicsService, GraphicsResolver],
  controllers: [GraphicsController],
})
export class GraphicsModule {}
