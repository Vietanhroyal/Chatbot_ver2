import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KnowledgeBaseService } from './knowledge-base.service';
import { EmbeddingService } from './embedding.service';
import { DocumentEntity } from '../database/entities';

@Module({
  imports: [TypeOrmModule.forFeature([DocumentEntity])],
  providers: [KnowledgeBaseService, EmbeddingService],
  exports: [KnowledgeBaseService, EmbeddingService],
})
export class KnowledgeBaseModule {}
