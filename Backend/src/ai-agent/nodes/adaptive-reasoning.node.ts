import { ChatOpenAI } from '@langchain/openai';
import { AgentState } from '../state';
import { CorePromptsService } from '../../core-prompts/core-prompts.service';
import { SkillsService } from '../../core-prompts/skills.service';
import {
  FALLBACK_ADAPTIVE_REASONING_PROMPT,
  FALLBACK_SKILL_MAP,
} from './fallback-prompts';

export const createAdaptiveReasoningNode = (
  corePrompts: CorePromptsService,
  skills: SkillsService,
) => {
  return async (
    state: AgentState,
  ): Promise<Partial<AgentState>> => {
    const history = state.conversation_history
      .map((m: any) => `${m.role}: ${m.content}`)
      .join('\n');

    const [promptTemplate, skillInstructions] = await Promise.all([
      corePrompts.getByCodeOrFallback(
        'adaptive_reasoning',
        FALLBACK_ADAPTIVE_REASONING_PROMPT,
      ),
      skills.getSystemPromptOrFallback(
        state.selected_skill ?? '',
        FALLBACK_SKILL_MAP,
      ),
    ]);

    const prompt = promptTemplate
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
};