import { createResponseStrategyNode } from './response-strategy.node'
import { CorePromptsService } from '../../core-prompts/core-prompts.service'
import { ResponseStrategiesService } from '../../response-strategies/response-strategies.service'
import { AgentState } from '../state'
import { ChatOpenAI } from '@langchain/openai'

jest.mock('@langchain/openai')

describe('ResponseStrategyNode', () => {
  let mockCorePrompts: any
  let mockResponseStrategies: any
  let mockLlm: any
  let node: Function

  beforeEach(() => {
    mockCorePrompts = { getByCodeOrFallback: jest.fn() }
    mockResponseStrategies = { getBySkill: jest.fn() }
    mockLlm = { invoke: jest.fn() }
    ;(ChatOpenAI as jest.Mock).mockImplementation(() => mockLlm)
    node = createResponseStrategyNode(mockCorePrompts, mockResponseStrategies)
  })

  const createState = (overrides: Partial<AgentState> = {}): AgentState => ({
    user_message: 'Học phí',
    session_id: 'test',
    conversation_history: [],
    is_safe: true,
    pending_clarification: null,
    clarification_resolved: false,
    intent: { name: 'tuition_inquiry', confidence: 0.9 },
    selected_skill: 'tuition_skill',
    retrieval_plan: null,
    retrieved_knowledge: null,
    reasoning_level: 'shallow',
    need_more_info: false,
    missing_info_fields: null,
    response_strategy: 'Học phí ngành IT là 15tr.',
    response_type: 'final_answer',
    final_messages: null,
    ...overrides,
  })

  it('should load response_strategy prompt from DB', async () => {
    mockCorePrompts.getByCodeOrFallback.mockResolvedValue('template')
    mockResponseStrategies.getBySkill.mockResolvedValue([])
    mockLlm.invoke.mockResolvedValue({
      content: JSON.stringify({
        messages: [{ type: 'text', content: 'formatted' }],
      }),
    })

    await node(createState())

    expect(mockCorePrompts.getByCodeOrFallback).toHaveBeenCalledWith(
      'response_strategy',
      expect.any(String),
    )
  })

  it('should look up custom strategy by skill', async () => {
    mockCorePrompts.getByCodeOrFallback.mockResolvedValue('template')
    mockResponseStrategies.getBySkill.mockResolvedValue([])
    mockLlm.invoke.mockResolvedValue({
      content: JSON.stringify({ messages: [] }),
    })

    await node(createState({ selected_skill: 'tuition_skill' }))

    expect(mockResponseStrategies.getBySkill).toHaveBeenCalledWith(
      'tuition_skill',
    )
  })

  it('should return formatted messages from LLM', async () => {
    mockCorePrompts.getByCodeOrFallback.mockResolvedValue('template')
    mockResponseStrategies.getBySkill.mockResolvedValue([])
    mockLlm.invoke.mockResolvedValue({
      content: JSON.stringify({
        messages: [
          { type: 'text', content: 'Chào em!' },
          { type: 'text', content: 'Học phí 15tr.' },
        ],
      }),
    })

    const result = await node(createState())

    expect(result.final_messages).toEqual([
      { type: 'text', content: 'Chào em!' },
      { type: 'text', content: 'Học phí 15tr.' },
    ])
  })

  it('should fall back to raw message when LLM returns empty messages', async () => {
    mockCorePrompts.getByCodeOrFallback.mockResolvedValue('template')
    mockResponseStrategies.getBySkill.mockResolvedValue([])
    mockLlm.invoke.mockResolvedValue({
      content: JSON.stringify({ messages: [] }),
    })

    const result = await node(createState({ response_strategy: 'raw message' }))

    expect(result.final_messages).toEqual([
      { type: 'text', content: 'raw message' },
    ])
  })

  it('should return raw message on LLM error', async () => {
    mockCorePrompts.getByCodeOrFallback.mockResolvedValue('template')
    mockResponseStrategies.getBySkill.mockResolvedValue([])
    mockLlm.invoke.mockRejectedValue(new Error('LLM down'))

    const result = await node(createState({ response_strategy: 'raw message' }))

    expect(result.final_messages).toEqual([
      { type: 'text', content: 'raw message' },
    ])
  })

  it('should handle undefined response_strategy gracefully', async () => {
    mockCorePrompts.getByCodeOrFallback.mockResolvedValue('template')
    mockResponseStrategies.getBySkill.mockResolvedValue([])
    mockLlm.invoke.mockResolvedValue({
      content: JSON.stringify({ messages: [] }),
    })

    const result = await node(createState({ response_strategy: null }))

    expect(result.final_messages).toEqual([{ type: 'text', content: '' }])
  })
})
