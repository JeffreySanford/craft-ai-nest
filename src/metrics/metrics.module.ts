import { Module } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { MetricsGateway } from './metrics.gateway';
import { MongooseModule } from '@nestjs/mongoose';
import { LoggerModule } from '../logger/logger.module';
import { MetricSchema } from './metrics.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Metric', schema: MetricSchema }]),
    LoggerModule,
  ],
  controllers: [MetricsController],
  providers: [MetricsService, MetricsGateway],
  exports: [MetricsService],
})
export class MetricsModule {}
