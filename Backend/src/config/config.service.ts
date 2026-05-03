import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService) {}

  // Getters for environment variables
  get nodeEnv(): string {
    return this.configService.get<string>('NODE_ENV', 'development')
  }

  get port(): number {
    return this.configService.get<number>('PORT', 3000)
  }

  get openAiApiKey(): string {
    return this.configService.getOrThrow<string>('OPENAI_API_KEY') //getOrThrow ensures that the value is present
  }
}
