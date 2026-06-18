import { ChatOpenAI } from '@langchain/openai'
import { Logger } from '@nestjs/common'
import { AgentState } from '../state'
import { CorePromptsService } from '../../core-prompts/core-prompts.service'
import { SkillsService } from '../../core-prompts/skills.service'
import {
  FALLBACK_ADAPTIVE_REASONING_PROMPT,
  FALLBACK_SKILL_MAP,
} from './fallback-prompts'
import { INTENTS, SKILLS } from '../../common/constants'
import {
  buildSecureMessages,
  buildHistoryContext,
  buildSecureUserMessage,
  GUARD_REMINDER,
  extractJson,
} from '../../common/prompts'

const logger = new Logger('AdaptiveReasoningNode')


const normalize = (value: unknown): string =>
  String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

const includesAny = (text: string, patterns: RegExp[]): boolean =>
  patterns.some(pattern => pattern.test(text))

const CAREER_DECISION_PATTERNS = [
  /nen chon/,
  /chon nganh nao/,
  /nganh nao hon/,
  /cai nao hon/,
  /phu hop hon/,
  /phan van giua/,
  /so sanh/,
  /chon .* hay /,
]

const ACADEMIC_STRENGTH_PATTERNS = [
  /hoc luc/,
  /diem/,
  /khoi [a-d]/,
  /gioi/,
  /manh ve/,
  /yeu/,
  /toan/,
  /logic/,
  /lap trinh/,
  /code/,
  /tieng anh/,
]

const CAREER_GOAL_PATTERNS = [
  /muc tieu/,
  /muon lam/,
  /dinh huong/,
  /nghe nghiep/,
  /cong viec/,
  /developer/,
  /lap trinh vien/,
  /quan ly/,
  /marketing/,
  /brse/,
  /startup/,
  /khoi nghiep/,
]

const shouldAskCareerDecisionClarification = (state: AgentState): boolean => {
  const isCareerSkill =
    state.selected_skill === SKILLS.CAREER_CONSULTING ||
    state.intent?.name === INTENTS.MAJOR_CONSULTATION

  if (!isCareerSkill) return false

  const historyText = state.conversation_history
    .map(message => message.content)
    .join(' ')
  const profileText = JSON.stringify(state.user_profile ?? {})
  const allKnownText = normalize(
    `${historyText} ${profileText} ${state.user_message}`,
  )
  const currentText = normalize(state.user_message)

  const asksForDecision = includesAny(currentText, CAREER_DECISION_PATTERNS)
  if (!asksForDecision) return false

  const hasAcademicStrength = includesAny(
    allKnownText,
    ACADEMIC_STRENGTH_PATTERNS,
  )
  const hasCareerGoal = includesAny(allKnownText, CAREER_GOAL_PATTERNS)

  return !hasAcademicStrength && !hasCareerGoal
}

export const createAdaptiveReasoningNode = (
  corePrompts: CorePromptsService,
  skills: SkillsService,
) => {
  return async (state: AgentState): Promise<Partial<AgentState>> => {
    const historyStr = buildHistoryContext(state.conversation_history)

    const [promptTemplate, skillInstructions] = await Promise.all([
      corePrompts.getByCodeOrFallback(
        'adaptive_reasoning',
        FALLBACK_ADAPTIVE_REASONING_PROMPT,
      ),
      skills.getSystemPromptOrFallback(
        state.selected_skill ?? '',
        FALLBACK_SKILL_MAP,
      ),
    ])

    if (shouldAskCareerDecisionClarification(state)) {
      return {
        need_more_info: true,
        reasoning_level: 'deep',
        missing_info_fields: ['academic_strengths', 'career_goal'],
        response_type: 'ask_clarification',
        response_strategy:
          'Mình chưa nên chốt giúp bạn giữa hai ngành chỉ dựa trên sở thích và tính cách. Để tư vấn sát hơn, bạn cho mình biết thêm: bạn mạnh hơn ở Toán/logic/lập trình hay giao tiếp/tổ chức/marketing, và sau này bạn muốn kiểu công việc kỹ thuật chuyên sâu hay làm việc nhiều với con người?',
      }
    }

    const systemPrompt =
      promptTemplate
        .replace(
          '{user_profile}',
          JSON.stringify(state.user_profile ?? {}, null, 2),
        )
        .replace('{intent}', state.intent?.name ?? 'unknown')
        .replace('{skill}', state.selected_skill ?? 'fallback')
        .replace(
          '{context}',
          state.retrieved_knowledge ?? 'No context available',
        )
        .replace('{conversation_history}', historyStr || 'None') +
      '\n\n' +
      skillInstructions

    const userMessage = buildSecureUserMessage(
      state.user_message,
      state.conversation_history,
      {
        intent: state.intent?.name ?? 'unknown',
        skill: state.selected_skill ?? 'fallback',
        user_profile: JSON.stringify(state.user_profile ?? {}),
        retrieved_context: state.retrieved_knowledge ?? 'No context available',
      },
    )

    const messages = buildSecureMessages({
      systemPrompt: systemPrompt + '\n\n' + GUARD_REMINDER,
      userMessage,
    })

    try {
      const llm = new ChatOpenAI({ modelName: 'gpt-4o-mini', temperature: 0.3 })
      const response = await llm.invoke(messages)
      const rawContent = response.content as string

      // LLM sometimes wraps JSON in ```json ... ``` markdown fences
      const jsonStr = extractJson(rawContent)
      const parsed = JSON.parse(jsonStr)

      return {
        need_more_info: parsed.need_more_info === true,
        reasoning_level: parsed.reasoning_level ?? 'shallow',
        missing_info_fields: parsed.missing_info_fields ?? [],
        response_strategy: parsed.message,
        response_type: parsed.response_type ?? 'final_answer',
      }
    } catch (err) {
      // Log the real error so it's visible during debugging
      logger.error('AdaptiveReasoning LLM call failed', err)
      return {
        need_more_info: false,
        reasoning_level: 'shallow',
        response_strategy: 'Xin lỗi, mình gặp lỗi khi xử lý. Vui lòng thử lại.',
        response_type: 'final_answer',
      }
    }
  }
}
