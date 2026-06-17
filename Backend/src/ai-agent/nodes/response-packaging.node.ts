import { AgentState } from '../state';
import { CorePromptsService } from '../../core-prompts/core-prompts.service';
import {
  FALLBACK_PACKAGING_CONFIG,
  PackagingConfig,
} from './fallback-prompts';

export const createResponsePackagingNode = (
  corePrompts: CorePromptsService,
) => {
  return async (
    state: AgentState,
  ): Promise<Partial<AgentState>> => {
    if (state.final_messages && state.final_messages.length > 0) {
      return {};
    }

    if (state.response_strategy) {
      const config = await corePrompts.getConfigByCodeOrFallback(
        'response_packaging',
        FALLBACK_PACKAGING_CONFIG,
      );

      let content = state.response_strategy;
      if (content.length > config.maxMessageLength) {
        content = content.substring(0, config.maxMessageLength) + '...';
      }

      return {
        final_messages: [{ type: 'text', content }],
      };
    }

    return {
      final_messages: [{
        type: 'text',
        content: 'Xin lỗi, mình chưa thể trả lời câu hỏi này. Vui lòng thử lại.',
      }],
    };
  };
};