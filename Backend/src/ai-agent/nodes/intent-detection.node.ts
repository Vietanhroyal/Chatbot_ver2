import { ChatOpenAI } from '@langchain/openai';
import { AgentState } from '../state';
import { INTENT_DETECTION_PROMPT } from '../../prompts';
import { INTENTS } from '../../common/constants';

/**
 * Node 6: Intent Detection (Rule + gpt-4o-mini)
 * Classifies the user's message into one of the predefined intents.
 */
export const intentDetectionNode = async (
  state: AgentState,
): Promise<Partial<AgentState>> => {
  const history = state.conversation_history
    .map((m) => `${m.role}: ${m.content}`)
    .join('\n');

  const prompt = INTENT_DETECTION_PROMPT
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
