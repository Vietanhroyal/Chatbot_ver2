import { Injectable, Logger, Inject } from '@nestjs/common'
import { OpenAIEmbeddings } from '@langchain/openai'
import { ConfigService } from '@nestjs/config'
import type { Embeddings } from '@langchain/core/embeddings'

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name)
  private embeddings: Embeddings

  constructor(
    @Inject('EMBEDDING_MODEL')
    private embeddingModel: OpenAIEmbeddings,
    private configService: ConfigService,
  ) {
    this.embeddings = embeddingModel
  }

  async embed(text: string): Promise<number[]> {
    try {
      return await this.embeddings.embedQuery(text)
    } catch (error) {
      this.logger.error(`Embedding failed: ${error}`)
      throw error
    }
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    try {
      return await this.embeddings.embedDocuments(texts)
    } catch (error) {
      this.logger.error(`Batch embedding failed: ${error}`)
      throw error
    }
  }
}