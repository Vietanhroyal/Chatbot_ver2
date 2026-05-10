import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ChatRequestDto } from './dto/chat-request.dto';
import { ChatResponseDto } from './dto/chat-response.dto';
import { AiAgentService } from '../ai-agent/ai-agent.service';
import { LoggingService } from '../logging/logging.service';
import { ERROR_CODE } from '../common/constants';

@Injectable()
export class AiChatService {
  private readonly logger = new Logger(AiChatService.name);

  constructor(
    private readonly aiAgentService: AiAgentService,
    private readonly loggingService: LoggingService,
  ) {}

  async processMessage(request: ChatRequestDto): Promise<ChatResponseDto> {
    const startTime = Date.now();

    try {
      // Cast the incoming context type to ClarificationType, default 'missing_info' to satisfy TS
      const pendingClarification = request.context?.pending_clarification
        ? {
            ...request.context.pending_clarification,
            type: (request.context.pending_clarification.type === 'intent' ? 'intent' : 'missing_info') as 'intent' | 'missing_info',
          }
        : null;

      const finalState = await this.aiAgentService.invoke({
        session_id: request.session_id,
        user_message: request.message,
        conversation_history: request.context?.conversation_history ?? [],
        pending_clarification: pendingClarification,
      });

      const latency = Date.now() - startTime;

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
      };

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
      });

      return response;
    } catch (error) {
      this.logger.error('Agent invocation failed', error);
      throw new HttpException(
        { code: ERROR_CODE.AI_SERVICE_ERROR, message: 'Failed to generate AI response' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
