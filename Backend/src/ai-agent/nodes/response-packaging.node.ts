import { AgentState } from '../state'
import { CorePromptsService } from '../../core-prompts/core-prompts.service'
import { FALLBACK_PACKAGING_CONFIG, PackagingConfig } from './fallback-prompts'
import { OutputValidatorService } from '../../common/services/output-validator.service'

export const createResponsePackagingNode = (
  corePrompts: CorePromptsService,
  validator: OutputValidatorService,
) => {
  return async (state: AgentState): Promise<Partial<AgentState>> => {
    if (state.final_messages && state.final_messages.length > 0) {
      const validated = validator.validateMessages(state.final_messages)
      return { final_messages: validated }
    }

    if (state.response_strategy) {
      const config = await corePrompts.getConfigByCodeOrFallback(
        'response_packaging',
        FALLBACK_PACKAGING_CONFIG,
      )

      let content = state.response_strategy
      if (content.length > config.maxMessageLength) {
        content = content.substring(0, config.maxMessageLength) + '...'
      }

      const validated = validator.validate(content)
      return {
        final_messages: [
          {
            type: 'text',
            content: validated.sanitizedContent ?? content,
          },
        ],
      }
    }

    return {
      final_messages: [
        {
          type: 'text',
          content:
            'Xin lỗi, mình chưa thể trả lời câu hỏi này. Vui lòng thử lại.',
        },
      ],
    }
  }
}
