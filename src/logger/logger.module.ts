import { Module, Global } from '@nestjs/common';
import { LoggerService } from './logger.service';
import { LogsController } from './logs.controller';
import { TemplateModule } from '../shared/templates/template.module';
import { WinstonModule } from '../winston/winston.module';

@Global()
@Module({
  imports: [TemplateModule, WinstonModule],
  controllers: [LogsController],
  providers: [LoggerService],
  exports: [LoggerService],
})
export class LoggerModule {}
