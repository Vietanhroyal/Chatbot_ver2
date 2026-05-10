import { ChatOpenAI } from '@langchain/openai';
import { AgentState } from '../state';
import { RESPONSE_STRATEGY_PROMPT } from '../../prompts';

/**
 * Node 13: Response Strategy — THE PRESENTER (gpt-4o-mini)
 * Takes the raw drafted message and shapes it with empathy, tone, splitting.
 * Does NOT re-evaluate business logic.
 */
export const responseStrategyNode = async (
  state: AgentState,
): Promise<Partial<AgentState>> => {
  const rawMessage = state.response_strategy ?? '';

  const prompt = RESPONSE_STRATEGY_PROMPT
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
    // Fallback: use the raw message directly
    return {
      final_messages: [{ type: 'text', content: rawMessage }],
    };
  }
};
