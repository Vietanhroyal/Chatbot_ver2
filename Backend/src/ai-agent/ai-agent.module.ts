import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AiAgentService } from './ai-agent.service'
import { KnowledgeBaseModule } from '../knowledge-base/knowledge-base.module'
import { CorePromptsModule } from '../core-prompts/core-prompts.module'
import { ResponseStrategiesModule } from '../response-strategies/response-strategies.module'
import { CommonModule } from '../common/common.module'
import { CorePromptEntity } from '../database/entities/core-prompt.entity'
import { SkillEntity } from '../database/entities/skill.entity'

@Module({
  imports: [
    KnowledgeBaseModule,
    CorePromptsModule,
    ResponseStrategiesModule,
    CommonModule,
    TypeOrmModule.forFeature([CorePromptEntity, SkillEntity]),
  ],
  providers: [AiAgentService],
  exports: [AiAgentService],
})
export class AiAgentModule {}
