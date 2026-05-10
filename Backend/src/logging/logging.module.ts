import { Global, Module } from '@nestjs/common';
import { LoggingService } from './logging.service';

/**
 * Global logging module.
 * @Global ensures any module can inject LoggingService
 * without explicitly importing LoggingModule.
 */
@Global()
@Module({
  providers: [LoggingService],
  exports: [LoggingService],
})
export class LoggingModule {}
