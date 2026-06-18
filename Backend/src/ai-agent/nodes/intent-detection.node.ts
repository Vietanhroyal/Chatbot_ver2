import { ChatOpenAI } from '@langchain/openai'
import { Logger } from '@nestjs/common'
import { AgentState } from '../state'
import { CorePromptsService } from '../../core-prompts/core-prompts.service'
import { INTENTS } from '../../common/constants'
import { FALLBACK_INTENT_DETECTION_PROMPT } from './fallback-prompts'
import {
  buildSecureMessages,
  buildHistoryContext,
  GUARD_REMINDER,
  extractJson,
} from '../../common/prompts'

const logger = new Logger('IntentDetectionNode')

export const createIntentDetectionNode = (corePrompts: CorePromptsService) => {
  return async (state: AgentState): Promise<Partial<AgentState>> => {
    const historyStr = buildHistoryContext(state.conversation_history)

    const promptTemplate = await corePrompts.getByCodeOrFallback(
      'intent_detection',
      FALLBACK_INTENT_DETECTION_PROMPT,
    )

    const systemPrompt = promptTemplate.replace(
      '{conversation_history}',
      historyStr,
    )

    const messages = buildSecureMessages({
      systemPrompt,
      userMessage: state.user_message,
    })

    try {
      const llm = new ChatOpenAI({
        modelName: 'gpt-4o-mini',
        temperature: 0,
      })

      const response = await llm.invoke(messages)
      const parsed = JSON.parse(extractJson(response.content as string))

      return {
        intent: {
          name: parsed.name || INTENTS.UNKNOWN,
          confidence: parsed.confidence ?? 0,
        },
      }
    } catch (err) {
      logger.error('IntentDetection LLM call failed', err)
      return {
        intent: { name: INTENTS.UNKNOWN, confidence: 0 },
      }
    }
  }
}
