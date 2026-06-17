import { ChatOpenAI } from '@langchain/openai';
import { AgentState } from '../state';
import { CorePromptsService } from '../../core-prompts/core-prompts.service';
import { FALLBACK_RESPONSE_STRATEGY_PROMPT } from './fallback-prompts';

export const createResponseStrategyNode = (corePrompts: CorePromptsService) => {
  return async (
    state: AgentState,
  ): Promise<Partial<AgentState>> => {
    const rawMessage = state.response_strategy ?? '';

    const promptTemplate = await corePrompts.getByCodeOrFallback(
      'response_strategy',
      FALLBACK_RESPONSE_STRATEGY_PROMPT,
    );

    const prompt = promptTemplate
      .replace('{raw_message}', rawMessage)
      .replace('{intent}', state.intent?.name ?? 'unknown')
      .replace('{response_type}', state.response_type)
      .replace('{channel}', 'web');

    try {
      const llm = new ChatOpenAI({ modelName: 'gpt-4o-mini', temperature: 0.5 });
      const response = await llm.invoke(prompt);
      const parsed = JSON.parse(response.content as string);

      const messages = (parsed.messages ?? []).map(
        (m: { type: string; content: string }) => ({
          type: 'text' as const,
          content: m.content,
        }),
      );

      return {
        final_messages: messages.length > 0
          ? messages
          : [{ type: 'text', content: rawMessage }],
      };
    } catch {
      return {
        final_messages: [{ type: 'text', content: rawMessage }],
      };
    }
  };
};