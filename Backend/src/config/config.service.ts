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
    return this.configService.getOrThrow<string>('OPENAI_API_KEY')
  }

  get dbHost(): string {
    return this.configService.get<string>('DB_HOST', 'localhost')
  }

  get dbPort(): number {
    return this.configService.get<number>('DB_PORT', 5432)
  }

  get dbUser(): string {
    return this.configService.get<string>('DB_USER', 'myuser')
  }

  get dbPassword(): string {
    return this.configService.get<string>('DB_PASSWORD', 'mypassword')
  }

  get dbName(): string {
    return this.configService.get<string>('DB_NAME', 'rag_db')
  }

  get embeddingModel(): string {
    return this.configService.get<string>('EMBEDDING_MODEL', 'text-embedding-3-small')
  }

  get useDbPrompts(): boolean {
    return this.configService.get<boolean>('USE_DB_PROMPTS', false)
  }

  get useRagSearch(): boolean {
    return this.configService.get<boolean>('USE_RAG_SEARCH', false)
  }

  get ragTopK(): number {
    return this.configService.get<number>('RAG_TOP_K', 5)
  }
}
