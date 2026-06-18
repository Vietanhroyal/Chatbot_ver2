import { Module } from '@nestjs/common'
import { AiChatController } from './ai-chat.controller'
import { AiChatService } from './ai-chat.service'
import { AiAgentModule } from '../ai-agent/ai-agent.module'
import { LoggingModule } from '../logging/logging.module'

@Module({
  imports: [AiAgentModule, LoggingModule],
  controllers: [AiChatController],
  providers: [AiChatService],
})
export class AiChatModule {}
