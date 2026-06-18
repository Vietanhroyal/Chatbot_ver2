import { conversationResumeNode } from './conversation-resume.node'
import { AgentState } from '../state'

describe('ConversationResumeNode', () => {
  const createState = (overrides: Partial<AgentState> = {}): AgentState => ({
    user_message: 'reply',
    session_id: 'test',
    conversation_history: [],
    is_safe: true,
    pending_clarification: null,
    clarification_resolved: false,
    intent: null,
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

  it('should pass through when no pending clarification', () => {
    const result = conversationResumeNode(
      createState({ pending_clarification: null }),
    )
    expect(result).toEqual({})
  })

  it('should pass through when there is pending clarification', () => {
    const pending = {
      type: 'missing_info' as const,
      question_asked: 'test',
    }
    const result = conversationResumeNode(
      createState({ pending_clarification: pending }),
    )
    expect(result).toEqual({})
  })
})
