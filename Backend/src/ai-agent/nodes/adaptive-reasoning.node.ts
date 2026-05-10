import { ChatOpenAI } from '@langchain/openai';
import { AgentState } from '../state';
import { ADAPTIVE_REASONING_PROMPT } from '../../prompts';
import { getSkillPrompt } from '../../prompts';

/**
 * Node 11: Adaptive Reasoning — THE BRAIN (gpt-4o-mini)
 * Evaluates RAG data, checks for missing info, drafts the raw answer.
 */
export const adaptiveReasoningNode = async (
  state: AgentState,
): Promise<Partial<AgentState>> => {
  const history = state.conversation_history
    .map((m: any) => `${m.role}: ${m.content}`)
    .join('\n');

  const skillInstructions = getSkillPrompt(state.selected_skill ?? '');

  const prompt = ADAPTIVE_REASONING_PROMPT
    .replace('{user_message}', state.user_message)
    .replace('{intent}', state.intent?.name ?? 'unknown')
    .replace('{skill}', state.selected_skill ?? 'fallback')
    .replace('{context}', state.retrieved_knowledge ?? 'No context available')
    .replace('{conversation_history}', history || 'None')
    .replace('{skill_instructions}', skillInstructions);

  try {
    const llm = new ChatOpenAI({ modelName: 'gpt-4o-mini', temperature: 0.3 });
    const response = await llm.invoke(prompt);
    const parsed = JSON.parse(response.content as string);

    return {
      need_more_info: parsed.need_more_info === true,
      reasoning_level: parsed.reasoning_level ?? 'shallow',
      missing_info_fields: parsed.missing_info_fields ?? [],
      response_strategy: parsed.message,
      response_type: parsed.response_type ?? 'final_answer',
    };
  } catch {
    return {
      need_more_info: false,
      reasoning_level: 'shallow',
      response_strategy: 'Xin lỗi, mình gặp lỗi khi xử lý. Vui lòng thử lại.',
      response_type: 'final_answer',
    };
  }
};
