import { Module } from '@nestjs/common';
import { AiAgentService } from './ai-agent.service';
import { KnowledgeBaseModule } from '../knowledge-base/knowledge-base.module';

@Module({
  imports: [KnowledgeBaseModule],
  providers: [AiAgentService],
  exports: [AiAgentService],
})
export class AiAgentModule {}
