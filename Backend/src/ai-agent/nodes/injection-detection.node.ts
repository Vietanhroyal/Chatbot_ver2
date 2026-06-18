import { ChatOpenAI } from '@langchain/openai'
import { AgentState } from '../state'
import { INJECTION_DETECTION_PROMPT } from '../prompts/injection-detection.prompt'
import { Logger } from '@nestjs/common'
import {
  buildSecureMessages,
  buildHistoryContext,
  GUARD_REMINDER,
} from '../../common/prompts'

const INJECTION_CONFIDENCE_THRESHOLD = 0.7

interface InjectionDetectionResult {
  category: string
  confidence: number
  reasoning: string
}

export const injectionDetectionNode = async (
  state: AgentState,
): Promise<Partial<AgentState>> => {
  const logger = new Logger('InjectionDetection')

  const historyStr = buildHistoryContext(state.conversation_history)

  const systemPrompt = INJECTION_DETECTION_PROMPT.replace(
    '{user_message}',
    '{user_message}',
  ).replace('{conversation_history}', historyStr || 'None')

  const messages = buildSecureMessages({
    systemPrompt: systemPrompt + GUARD_REMINDER,
    userMessage: state.user_message,
  })

  try {
    const llm = new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      temperature: 0,
    })

    const response = await llm.invoke(messages)
    const parsed: InjectionDetectionResult = JSON.parse(
      response.content as string,
    )

    const isInjection =
      parsed.category !== 'none' &&
      parsed.confidence >= INJECTION_CONFIDENCE_THRESHOLD

    if (isInjection) {
      logger.warn({
        event: 'injection_detected_llm',
        category: parsed.category,
        confidence: parsed.confidence,
        reasoning: parsed.reasoning,
        session_id: state.session_id,
        user_message_preview: state.user_message.substring(0, 100),
      })
    }

    return {
      is_safe: !isInjection,
    }
  } catch (err) {
    logger.error('Injection detection LLM failed', err)
    return { is_safe: true }
  }
}
