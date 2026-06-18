import { AgentState } from '../state'

/**
 * Node 12: Missing Info Strategy (Template/Rule)
 * Standardizes the clarification question drafted by adaptive_reasoning.
 * Attaches predefined quick replies if applicable.
 * No LLM needed.
 */
export const missingInfoStrategyNode = (
  state: AgentState,
): Partial<AgentState> => {
  // The adaptive_reasoning_node already drafted the question in response_strategy
  // This node wraps it into the pending_clarification state

  const draftedQuestion =
    state.response_strategy ??
    'Mình cần thêm thông tin để tư vấn chính xác hơn. Em có thể chia sẻ thêm không?'

  return {
    response_type: 'ask_clarification',
    pending_clarification: {
      type: 'missing_info',
      original_intent: state.intent?.name,
      original_skill: state.selected_skill ?? undefined,
      missing_entities: state.missing_info_fields ?? [],
      question_asked: draftedQuestion,
    },
    final_messages: [{ type: 'text', content: draftedQuestion }],
  }
}
