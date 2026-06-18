import { Module } from '@nestjs/common'
import { OutputValidatorService } from './services/output-validator.service'
import { SecurityLoggerService } from './security-logger.service'

@Module({
  providers: [OutputValidatorService, SecurityLoggerService],
  exports: [OutputValidatorService, SecurityLoggerService],
})
export class CommonModule {}
