import { Injectable, Logger } from '@nestjs/common'

export interface SecurityEvent {
  event: 'injection_blocked' | 'injection_detected_llm' | 'rate_limit_hit'
  category?: string
  confidence?: number
  pattern?: string
  session_id?: string
  user_message_preview: string
  timestamp: string
}

@Injectable()
export class SecurityLoggerService {
  private readonly logger = new Logger('Security')

  log(event: SecurityEvent) {
    this.logger.warn(JSON.stringify(event))
  }
}
