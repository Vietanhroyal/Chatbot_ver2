import { ReasoningLevel } from '../../common/types';

/**
 * Output shape for POST /api/v1/ai/chat
 * Contract defined in api_flow.md § 1.4 and § 1.5
 */
export class ChatResponseDto {
  session_id: string;

  intent: {
    name: string;
    confidence: number;
  };

  skill: {
    name: string;
  };

  reasoning: {
    level: ReasoningLevel;
    need_more_info: boolean;
    strategy: string;
  };

  messages: Array<{
    type: 'text';
    content: string;
  }>;

  pending_clarification?: {
    type: string;
    original_intent?: string;
    original_skill?: string;
    missing_entities?: string[];
    question_asked?: string;
  } | null;

  metadata?: {
    retrieved_sources?: Array<{
      source_id: string;
      title: string;
    }>;
    latency_ms?: number;
    model?: string;
  };
}
