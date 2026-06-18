import { ChatOpenAI } from '@langchain/openai'
import { AgentState } from '../state'
import { CorePromptsService } from '../../core-prompts/core-prompts.service'
import { FALLBACK_CLARIFICATION_RESOLUTION_PROMPT } from './fallback-prompts'
import { buildSecureMessages, GUARD_REMINDER } from '../../common/prompts'

export const createClarificationResolutionNode = (
  corePrompts: CorePromptsService,
) => {
  return async (state: AgentState): Promise<Partial<AgentState>> => {
    const pending = state.pending_clarification
    if (!pending) {
      return { clarification_resolved: false }
    }

    const promptTemplate = await corePrompts.getByCodeOrFallback(
      'clarification_resolution',
      FALLBACK_CLARIFICATION_RESOLUTION_PROMPT,
    )

    const systemPrompt = promptTemplate
      .replace('{pending_question}', pending.question_asked ?? '')
      .replace('{pending_type}', pending.type)
      .replace('{missing_fields}', (pending.missing_entities ?? []).join(', '))

    const messages = buildSecureMessages({
      systemPrompt,
      userMessage: state.user_message,
    })

    try {
      const llm = new ChatOpenAI({ modelName: 'gpt-4o-mini', temperature: 0 })
      const response = await llm.invoke(messages)
      const parsed = JSON.parse(response.content as string)

      return { clarification_resolved: parsed.resolved === true }
    } catch {
      return { clarification_resolved: false }
    }
  }
}
