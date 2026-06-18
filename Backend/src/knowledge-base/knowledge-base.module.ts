import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { KnowledgeBaseService } from './knowledge-base.service'
import { EmbeddingService } from './embedding.service'
import { EmbeddingModule } from './embedding.module'
import { SanitizeService } from './sanitize.service'
import { DocumentEntity } from '../database/entities'

@Module({
  imports: [TypeOrmModule.forFeature([DocumentEntity]), EmbeddingModule],
  providers: [KnowledgeBaseService, EmbeddingService, SanitizeService],
  exports: [KnowledgeBaseService, EmbeddingService, SanitizeService],
})
export class KnowledgeBaseModule {}
