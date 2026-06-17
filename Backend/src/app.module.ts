import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { AppConfigModule } from './config/config.module'
import { DatabaseModule } from './database/database.module'
import { HealthModule } from './health/health.module'
import { AiChatModule } from './ai-chat/ai-chat.module'
import { AiAgentModule } from './ai-agent/ai-agent.module'
import { KnowledgeBaseModule } from './knowledge-base/knowledge-base.module'
import { LoggingModule } from './logging/logging.module'

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    HealthModule,
    AiChatModule,
    AiAgentModule,
    KnowledgeBaseModule,
    LoggingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
