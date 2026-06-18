import { retrievalPlanningNode } from './retrieval-planning.node'
import { AgentState } from '../state'

describe('RetrievalPlanningNode', () => {
  const createState = (overrides: Partial<AgentState> = {}): AgentState => ({
    user_message: 'Học phí IT',
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

  it('should include user_message as first query', () => {
    const result = retrievalPlanningNode(
      createState({ user_message: 'test question' }),
    )
    expect(result.retrieval_plan).toContain('test question')
  })

  it('should include intent as second query when available', () => {
    const result = retrievalPlanningNode(
      createState({ intent: { name: 'tuition_inquiry', confidence: 0.9 } }),
    )
    expect(result.retrieval_plan).toContain('tuition inquiry')
  })

  it('should not include intent query when intent is null', () => {
    const result = retrievalPlanningNode(createState({ intent: null }))
    expect(result.retrieval_plan).toHaveLength(1)
  })

  it('should replace underscores with spaces in intent name', () => {
    const result = retrievalPlanningNode(
      createState({
        intent: { name: 'human_support_request', confidence: 0.9 },
      }),
    )
    expect(result.retrieval_plan).toContain('human support request')
    expect(result.retrieval_plan).not.toContain('human_support_request')
  })
})
