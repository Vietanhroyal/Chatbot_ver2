import { createAdaptiveReasoningNode } from './adaptive-reasoning.node'
import { CorePromptsService } from '../../core-prompts/core-prompts.service'
import { SkillsService } from '../../core-prompts/skills.service'
import { AgentState } from '../state'
import { ChatOpenAI } from '@langchain/openai'
import { SKILLS } from '../../common/constants'

jest.mock('@langchain/openai')

describe('AdaptiveReasoningNode', () => {
  let mockCorePrompts: any
  let mockSkills: any
  let mockLlm: any
  let node: Function

  beforeEach(() => {
    mockCorePrompts = { getByCodeOrFallback: jest.fn() }
    mockSkills = { getSystemPromptOrFallback: jest.fn() }
    mockLlm = { invoke: jest.fn() }
    ;(ChatOpenAI as jest.Mock).mockImplementation(() => mockLlm)
    node = createAdaptiveReasoningNode(mockCorePrompts, mockSkills)
  })

  const createState = (overrides: Partial<AgentState> = {}): AgentState => ({
    user_message: 'Học phí ngành IT',
    session_id: 'test',
    conversation_history: [],
    user_profile: { facts: {}, preferences: [], goals: [], constraints: [] },
    is_safe: true,
    pending_clarification: null,
    clarification_resolved: false,
    intent: { name: 'tuition_inquiry', confidence: 0.9 },
    selected_skill: SKILLS.TUITION,
    retrieval_plan: ['Học phí ngành IT'],
    retrieved_knowledge: '[Source: tuition.md]\nHọc phí IT 15tr',
    reasoning_level: null,
    need_more_info: false,
    missing_info_fields: null,
    response_strategy: null,
    response_type: 'final_answer',
    final_messages: null,
    ...overrides,
  })

  it('should load adaptive_reasoning prompt from DB', async () => {
    mockCorePrompts.getByCodeOrFallback.mockResolvedValue('reasoning template')
    mockSkills.getSystemPromptOrFallback.mockResolvedValue('skill instructions')
    mockLlm.invoke.mockResolvedValue({
      content: JSON.stringify({ message: 'draft answer' }),
    })

    await node(createState())

    expect(mockCorePrompts.getByCodeOrFallback).toHaveBeenCalledWith(
      'adaptive_reasoning',
      expect.any(String),
    )
  })

  it('should load skill instructions based on selected_skill', async () => {
    mockCorePrompts.getByCodeOrFallback.mockResolvedValue('template')
    mockSkills.getSystemPromptOrFallback.mockResolvedValue('tuition skill')
    mockLlm.invoke.mockResolvedValue({
      content: JSON.stringify({ message: 'answer' }),
    })

    await node(createState({ selected_skill: SKILLS.TUITION }))

    expect(mockSkills.getSystemPromptOrFallback).toHaveBeenCalledWith(
      SKILLS.TUITION,
      expect.any(Object),
    )
  })

  it('should load both prompts in parallel', async () => {
    const order: string[] = []
    mockCorePrompts.getByCodeOrFallback.mockImplementation(async () => {
      order.push('core')
      return 'reasoning'
    })
    mockSkills.getSystemPromptOrFallback.mockImplementation(async () => {
      order.push('skill')
      return 'skill instructions'
    })
    mockLlm.invoke.mockResolvedValue({
      content: JSON.stringify({ message: 'x' }),
    })

    await node(createState())

    expect(order).toContain('core')
    expect(order).toContain('skill')
  })

  it('should return parsed response on success', async () => {
    mockCorePrompts.getByCodeOrFallback.mockResolvedValue('template')
    mockSkills.getSystemPromptOrFallback.mockResolvedValue('skill')
    mockLlm.invoke.mockResolvedValue({
      content: JSON.stringify({
        need_more_info: false,
        reasoning_level: 'shallow',
        message: 'Học phí IT 15tr',
        response_type: 'final_answer',
      }),
    })

    const result = await node(createState())

    expect(result.need_more_info).toBe(false)
    expect(result.reasoning_level).toBe('shallow')
    expect(result.response_strategy).toBe('Học phí IT 15tr')
    expect(result.response_type).toBe('final_answer')
  })

  it('should detect need_more_info=true', async () => {
    mockCorePrompts.getByCodeOrFallback.mockResolvedValue('template')
    mockSkills.getSystemPromptOrFallback.mockResolvedValue('skill')
    mockLlm.invoke.mockResolvedValue({
      content: JSON.stringify({
        need_more_info: true,
        message: 'Bạn muốn hỏi về ngành nào?',
        response_type: 'ask_clarification',
      }),
    })

    const result = await node(createState())

    expect(result.need_more_info).toBe(true)
    expect(result.response_type).toBe('ask_clarification')
  })

  it('should ask for decisive info before choosing between majors', async () => {
    mockCorePrompts.getByCodeOrFallback.mockResolvedValue('template')
    mockSkills.getSystemPromptOrFallback.mockResolvedValue('career skill')

    const result = await node(
      createState({
        user_message: 'vậy trong 2 cái đó tôi nên chọn ngành nào hơn?',
        conversation_history: [
          {
            role: 'user',
            content:
              'tôi thích công nghệ và kinh doanh. tuy nhiên lại khá là hướng ngoại',
          },
        ],
        user_profile: {
          facts: { personality: 'hướng ngoại' },
          preferences: ['công nghệ', 'kinh doanh'],
          goals: [],
          constraints: [],
        },
        intent: { name: 'major_consultation', confidence: 0.9 },
        selected_skill: SKILLS.CAREER_CONSULTING,
      }),
    )

    expect(result.need_more_info).toBe(true)
    expect(result.response_type).toBe('ask_clarification')
    expect(result.missing_info_fields).toEqual([
      'academic_strengths',
      'career_goal',
    ])
    expect(mockLlm.invoke).not.toHaveBeenCalled()
  })

  it('should allow career recommendation when a decisive goal is known', async () => {
    mockCorePrompts.getByCodeOrFallback.mockResolvedValue('template')
    mockSkills.getSystemPromptOrFallback.mockResolvedValue('career skill')
    mockLlm.invoke.mockResolvedValue({
      content: JSON.stringify({
        need_more_info: false,
        message: 'Nếu muốn làm marketing, Quản trị kinh doanh nghiêng hơn.',
        response_type: 'final_answer',
      }),
    })

    const result = await node(
      createState({
        user_message: 'vậy trong 2 cái đó tôi nên chọn ngành nào hơn?',
        conversation_history: [
          {
            role: 'user',
            content:
              'tôi thích công nghệ và kinh doanh, hướng ngoại, sau này muốn làm marketing',
          },
        ],
        user_profile: {
          facts: { personality: 'hướng ngoại' },
          preferences: ['công nghệ', 'kinh doanh'],
          goals: ['làm marketing'],
          constraints: [],
        },
        intent: { name: 'major_consultation', confidence: 0.9 },
        selected_skill: SKILLS.CAREER_CONSULTING,
      }),
    )

    expect(result.need_more_info).toBe(false)
    expect(mockLlm.invoke).toHaveBeenCalled()
  })

  it('should fallback to safe defaults on LLM error', async () => {
    mockCorePrompts.getByCodeOrFallback.mockResolvedValue('template')
    mockSkills.getSystemPromptOrFallback.mockResolvedValue('skill')
    mockLlm.invoke.mockRejectedValue(new Error('LLM down'))

    const result = await node(createState())

    expect(result.need_more_info).toBe(false)
    expect(result.reasoning_level).toBe('shallow')
    expect(result.response_type).toBe('final_answer')
    expect(result.response_strategy).toContain('lỗi')
  })

  it('should handle missing fields in LLM response with defaults', async () => {
    mockCorePrompts.getByCodeOrFallback.mockResolvedValue('template')
    mockSkills.getSystemPromptOrFallback.mockResolvedValue('skill')
    mockLlm.invoke.mockResolvedValue({
      content: JSON.stringify({ message: 'just message' }),
    })

    const result = await node(createState())

    expect(result.reasoning_level).toBe('shallow')
    expect(result.missing_info_fields).toEqual([])
    expect(result.response_type).toBe('final_answer')
  })
})
