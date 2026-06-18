import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common'
import { ChatRequestDto } from './dto/chat-request.dto'
import { ChatResponseDto } from './dto/chat-response.dto'
import { AiAgentService } from '../ai-agent/ai-agent.service'
import { LoggingService } from '../logging/logging.service'
import { ERROR_CODE } from '../common/constants'
import { PendingClarification } from '../ai-agent/state'
import { ClarificationType } from '../common/types'

@Injectable()
export class AiChatService {
  private readonly logger = new Logger(AiChatService.name)

  constructor(
    private readonly aiAgentService: AiAgentService,
    private readonly loggingService: LoggingService,
  ) {}

  async processMessage(request: ChatRequestDto): Promise<ChatResponseDto> {
    const startTime = Date.now()

    try {
      const incomingPending = request.context?.pending_clarification;
      let pendingClarification: PendingClarification | null = null;

      if (incomingPending) {
        const type: ClarificationType =
          incomingPending.type === 'intent' ? 'intent' : 'missing_info';
        pendingClarification = {
          type,
          original_intent: incomingPending.original_intent,
          original_skill: incomingPending.original_skill,
          missing_entities: incomingPending.missing_entities,
          question_asked: incomingPending.question_asked,
        };
      }

      const finalState = await this.aiAgentService.invoke({
        session_id: request.session_id,
        user_message: request.message,
        conversation_history: request.context?.conversation_history ?? [],
        pending_clarification: pendingClarification,
      })

      const latency = Date.now() - startTime

      const response: ChatResponseDto = {
        session_id: request.session_id,
        intent: finalState.intent ?? { name: 'unknown', confidence: 0 },
        skill: { name: finalState.selected_skill ?? 'fallback_skill' },
        reasoning: {
          level: finalState.reasoning_level ?? 'shallow',
          need_more_info: finalState.need_more_info,
          strategy: finalState.response_strategy ?? 'direct',
        },
        messages: finalState.final_messages ?? [
          { type: 'text', content: 'Xin lỗi, mình chưa có câu trả lời.' },
        ],
        pending_clarification: finalState.pending_clarification,
        metadata: { latency_ms: latency, model: 'gpt-4o-mini' },
      }

      // Fire-and-forget logging
      this.loggingService.logInteraction({
        sessionId: request.session_id,
        userMessage: request.message,
        intent: response.intent.name,
        intentConfidence: response.intent.confidence,
        skill: response.skill.name,
        reasoningLevel: response.reasoning.level,
        responseType: finalState.response_type,
        latencyMs: latency,
      })

      return response
    } catch (error) {
      this.logger.error('Agent invocation failed', error)
      throw new HttpException(
        {
          code: ERROR_CODE.AI_SERVICE_ERROR,
          message: 'Failed to generate AI response',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }
}
