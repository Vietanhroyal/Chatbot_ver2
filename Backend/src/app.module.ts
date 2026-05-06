import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { AppConfigModule } from './config/config.module'
import { HealthModule } from './health/health.module'
import { AiChatModule } from './ai-chat/ai-chat.module'

@Module({
  imports: [AppConfigModule, HealthModule, AiChatModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
