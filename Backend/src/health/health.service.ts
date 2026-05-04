import { Injectable } from '@nestjs/common'

export interface HealthCheckResponse {
  status: 'ok' | 'error'
  service: string
  timestamp: string
}

@Injectable()
export class HealthService {
  getHealthStatus(): HealthCheckResponse {
    return {
      status: 'ok',
      service: 'ai-chatbot-api',
      timestamp: new Date().toISOString(),
    }
  }
}
