import { skillSelectionNode } from './skill-selection.node'
import { AgentState } from '../state'
import { INTENTS, SKILLS } from '../../common/constants'

describe('SkillSelectionNode', () => {
  const createState = (overrides: Partial<AgentState> = {}): AgentState => ({
    user_message: 'test',
    session_id: 'test',
    conversation_history: [],
    is_safe: true,
    pending_clarification: null,
    clarification_resolved: false,
    intent: { name: 'tuition_inquiry', confidence: 0.9 },
    selected_skill: null,
    retrieval_plan: null,
    retrieved_knowledge: null,
    reasoning_level: null,
    need_more_info: false,
    missing_info_fields: null,
    response_strategy: null,
    response_type: 'final_answer',
    final_messages: null,
    ...overrides,
  })

  it('should map tuition_inquiry to tuition_explanation_skill', () => {
    const state = createState({
      intent: { name: INTENTS.TUITION_INQUIRY, confidence: 0.9 },
    })
    const result = skillSelectionNode(state)
    expect(result.selected_skill).toBe(SKILLS.TUITION)
  })

  it('should map major_inquiry to major_information_skill', () => {
    const state = createState({
      intent: { name: INTENTS.MAJOR_INQUIRY, confidence: 0.9 },
    })
    const result = skillSelectionNode(state)
    expect(result.selected_skill).toBe(SKILLS.MAJOR_INFO)
  })

  it('should map major_consultation to career_consulting_skill', () => {
    const state = createState({
      intent: { name: INTENTS.MAJOR_CONSULTATION, confidence: 0.9 },
    })
    const result = skillSelectionNode(state)
    expect(result.selected_skill).toBe(SKILLS.CAREER_CONSULTING)
  })

  it('should map scholarship_inquiry to scholarship skill', () => {
    const state = createState({
      intent: { name: INTENTS.SCHOLARSHIP_INQUIRY, confidence: 0.9 },
    })
    const result = skillSelectionNode(state)
    expect(result.selected_skill).toBe(SKILLS.SCHOLARSHIP)
  })

  it('should map human_support_request to human_handoff_skill', () => {
    const state = createState({
      intent: { name: INTENTS.HUMAN_SUPPORT_REQUEST, confidence: 0.9 },
    })
    const result = skillSelectionNode(state)
    expect(result.selected_skill).toBe(SKILLS.HUMAN_HANDOFF)
  })

  it('should map unknown intent to fallback_skill', () => {
    const state = createState({
      intent: { name: INTENTS.UNKNOWN, confidence: 0 },
    })
    const result = skillSelectionNode(state)
    expect(result.selected_skill).toBe(SKILLS.FALLBACK)
  })

  it('should map null intent to fallback_skill', () => {
    const state = createState({ intent: null })
    const result = skillSelectionNode(state)
    expect(result.selected_skill).toBe(SKILLS.FALLBACK)
  })

  it('should map general_faq to faq_skill', () => {
    const state = createState({
      intent: { name: INTENTS.GENERAL_FAQ, confidence: 0.9 },
    })
    const result = skillSelectionNode(state)
    expect(result.selected_skill).toBe(SKILLS.FAQ)
  })
})
