import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiAgentService } from './ai-agent.service';
import { KnowledgeBaseModule } from '../knowledge-base/knowledge-base.module';
import { CorePromptsService } from '../core-prompts/core-prompts.service';
import { SkillsService } from '../core-prompts/skills.service';
import { CorePromptEntity } from '../database/entities/core-prompt.entity';
import { SkillEntity } from '../database/entities/skill.entity';

@Module({
  imports: [
    KnowledgeBaseModule,
    TypeOrmModule.forFeature([CorePromptEntity, SkillEntity]),
  ],
  providers: [
    AiAgentService,
    CorePromptsService,
    SkillsService,
  ],
  exports: [AiAgentService],
})
export class AiAgentModule {}