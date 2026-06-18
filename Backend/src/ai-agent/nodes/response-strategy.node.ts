import { ChatOpenAI } from '@langchain/openai'
import { Logger } from '@nestjs/common'
import { AgentState } from '../state'
import { CorePromptsService } from '../../core-prompts/core-prompts.service'
import { ResponseStrategiesService } from '../../response-strategies/response-strategies.service'
import { FALLBACK_RESPONSE_STRATEGY_PROMPT } from './fallback-prompts'
import { buildSecureMessages, GUARD_REMINDER, extractJson } from '../../common/prompts'

const logger = new Logger('ResponseStrategyNode')

export const createResponseStrategyNode = (
  corePrompts: CorePromptsService,
  responseStrategies: ResponseStrategiesService,
) => {
  return async (state: AgentState): Promise<Partial<AgentState>> => {
    const rawMessage = state.response_strategy ?? ''

    let promptTemplate = await corePrompts.getByCodeOrFallback(
      'response_strategy',
      FALLBACK_RESPONSE_STRATEGY_PROMPT,
    )

    try {
      const customStrategies = await responseStrategies.getBySkill(
        state.selected_skill ?? '',
      )
      if (customStrategies.length > 0) {
        promptTemplate = customStrategies[0].strategyText
      }
    } catch (err) {
      console.warn('Failed to fetch custom strategy, using fallback:', err)
    }

    const historyStr = state.conversation_history
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n')

    const systemPrompt = promptTemplate
      .replace('{intent}', state.intent?.name ?? 'unknown')
      .replace('{response_type}', state.response_type)
      .replace('{channel}', 'web')
      .replace('{skill}', state.selected_skill ?? 'fallback')
      .replace('{conversation_history}', historyStr || 'None')

    const llmMessages = buildSecureMessages({
      systemPrompt: systemPrompt + GUARD_REMINDER,
      userMessage: rawMessage,
    })

    try {
      const llm = new ChatOpenAI({ modelName: 'gpt-4o-mini', temperature: 0.5 })
      const response = await llm.invoke(llmMessages)
      const parsed = JSON.parse(extractJson(response.content as string))

      const finalMessages = (parsed.messages ?? []).map(
        (m: { type: string; content: string }) => ({
          type: 'text' as const,
          content: m.content,
        }),
      )

      return {
        final_messages:
          finalMessages.length > 0
            ? finalMessages
            : [{ type: 'text', content: rawMessage }],
      }
    } catch (err) {
      logger.error('ResponseStrategy LLM call failed', err)
      return {
        final_messages: [{ type: 'text', content: rawMessage }],
      }
    }
  }
}
