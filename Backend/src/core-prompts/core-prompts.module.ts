import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CorePromptEntity } from '../database/entities'
import { CorePromptsService } from './core-prompts.service'

@Module({
  imports: [TypeOrmModule.forFeature([CorePromptEntity])],
  providers: [CorePromptsService],
  exports: [CorePromptsService],
})
export class CorePromptsModule {}