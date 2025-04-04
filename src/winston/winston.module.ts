import { Module } from '@nestjs/common';
import { WinstonLoggingService } from './winston-logging.service';

@Module({
  providers: [WinstonLoggingService],
  exports: [WinstonLoggingService],
})
export class WinstonModule {}
