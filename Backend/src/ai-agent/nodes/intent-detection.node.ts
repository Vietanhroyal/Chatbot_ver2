import { ChatOpenAI } from '@langchain/openai';
import { AgentState } from '../state';
import { CorePromptsService } from '../../core-prompts/core-prompts.service';
import { INTENTS } from '../../common/constants';
import { FALLBACK_INTENT_DETECTION_PROMPT } from './fallback-prompts';

export const createIntentDetectionNode = (corePrompts: CorePromptsService) => {
  return async (
    state: AgentState,
  ): Promise<Partial<AgentState>> => {
    const history = state.conversation_history
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n');

    const promptTemplate = await corePrompts.getByCodeOrFallback(
      'intent_detection',
      FALLBACK_INTENT_DETECTION_PROMPT,
    );

    const prompt = promptTemplate
      .replace('{user_message}', state.user_message)
      .replace('{conversation_history}', history || 'None');

    try {
      const llm = new ChatOpenAI({
        modelName: 'gpt-4o-mini',
        temperature: 0,
      });

      const response = await llm.invoke(prompt);
      const parsed = JSON.parse(response.content as string);

      return {
        intent: {
          name: parsed.name || INTENTS.UNKNOWN,
          confidence: parsed.confidence ?? 0,
        },
      };
    } catch {
      return {
        intent: { name: INTENTS.UNKNOWN, confidence: 0 },
      };
    }
  };
};