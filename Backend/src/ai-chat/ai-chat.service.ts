import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common'
import { ChatRequestDto } from './dto/chat-request.dto'
import { ChatResponseDto } from './dto/chat-response.dto'
import { ERROR_CODE } from 'src/common/constants'
import { AiServiceException } from 'src/common/exceptions/ai.excepton'

@Injectable()
export class AiChatService {
  private readonly logger = new Logger(AiChatService.name)
 
 

  async processMessage(request: ChatRequestDto): Promise<ChatResponseDto> {
    try {
      return {
        session_id: '1',
        intent: {
          name: 'fee',
          confidence: 1,
        },
        skill: {
          name: 'test-skill',
        },
        reasoning: {
          level: 'shallow',
          need_more_info: false,
          strategy: 'fash response',
        },
        message: [
          {
            type: 'text',
            content: 'hello from aichat controller',
          },
        ],
        metadata: {
          latency_ms: 0,
          model: 'test',
        },
      }
    } catch (error) {
      this.logger.error('Failed to process message')
      throw new AiServiceException('get ai response error')
    }
  }
}
