import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CorePromptEntity, SkillEntity } from '../database/entities'
import { CorePromptsService } from './core-prompts.service'
import { SkillsService } from './skills.service'

@Module({
  imports: [TypeOrmModule.forFeature([CorePromptEntity, SkillEntity])],
  providers: [CorePromptsService, SkillsService],
  exports: [CorePromptsService, SkillsService],
})
export class CorePromptsModule {}
