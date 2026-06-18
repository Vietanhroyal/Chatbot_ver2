import { createKnowledgeRetrievalNode } from './knowledge-retrieval.node'
import { AgentState } from '../state'

describe('KnowledgeRetrievalNode', () => {
  let mockKbService: any
  let node: Function

  beforeEach(() => {
    mockKbService = { search: jest.fn() }
    node = createKnowledgeRetrievalNode(mockKbService)
  })

  const createState = (overrides: Partial<AgentState> = {}): AgentState => ({
    user_message: 'Học phí ngành IT',
    session_id: 'test',
    conversation_history: [],
    is_safe: true,
    pending_clarification: null,
    clarification_resolved: false,
    intent: { name: 'tuition_inquiry', confidence: 0.9 },
    selected_skill: 'tuition_skill',
    retrieval_plan: ['Học phí ngành IT'],
    retrieved_knowledge: null,
    reasoning_level: null,
    need_more_info: false,
    missing_info_fields: null,
    response_strategy: null,
    response_type: 'final_answer',
    final_messages: null,
    ...overrides,
  })

  it('should use first query from retrieval_plan', async () => {
    mockKbService.search.mockResolvedValue([
      { content: 'tuition content', source: 'tuition.md' },
    ])

    await node(createState({ retrieval_plan: ['query1', 'query2'] }))

    expect(mockKbService.search).toHaveBeenCalledWith('query1', 'tuition_skill')
  })

  it('should fall back to user_message when retrieval_plan is empty', async () => {
    mockKbService.search.mockResolvedValue([])

    await node(
      createState({ retrieval_plan: null, user_message: 'fallback query' }),
    )

    expect(mockKbService.search).toHaveBeenCalledWith(
      'fallback query',
      'tuition_skill',
    )
  })

  it('should combine results with source attribution', async () => {
    mockKbService.search.mockResolvedValue([
      { content: 'Content 1', source: 'tuition.md' },
      { content: 'Content 2', source: 'faq.json#1' },
    ])

    const result = await node(createState())

    expect(result.retrieved_knowledge).toContain('[Source: tuition.md]')
    expect(result.retrieved_knowledge).toContain('[Source: faq.json#1]')
    expect(result.retrieved_knowledge).toContain('Content 1')
    expect(result.retrieved_knowledge).toContain('Content 2')
  })

  it('should return fallback message when no results', async () => {
    mockKbService.search.mockResolvedValue([])
    const result = await node(createState())
    expect(result.retrieved_knowledge).toBe('No relevant information found.')
  })

  it('should pass undefined as skill when selected_skill is null', async () => {
    mockKbService.search.mockResolvedValue([])
    await node(createState({ selected_skill: null }))
    expect(mockKbService.search).toHaveBeenCalledWith(
      expect.any(String),
      undefined,
    )
  })
})
