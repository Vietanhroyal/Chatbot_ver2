import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { OpenAIEmbeddings } from '@langchain/openai'

@Module({
  providers: [
    {
      provide: 'EMBEDDING_MODEL',
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return new OpenAIEmbeddings({
          modelName: configService.get<string>(
            'EMBEDDING_MODEL',
            'text-embedding-3-small',
          ),
        })
      },
    },
  ],
  exports: ['EMBEDDING_MODEL'],
})
export class EmbeddingModule {}
