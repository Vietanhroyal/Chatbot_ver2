import { AgentState } from '../state'

/**
 * Node 4: Clarification Retry Strategy (Template)
 * Generates a simpler version of the pending question.
 * No LLM needed — uses templates.
 */
export const clarificationRetryStrategyNode = (
  state: AgentState,
): Partial<AgentState> => {
  const pending = state.pending_clarification
  const originalQuestion = pending?.question_asked ?? ''

  // Simplify the question with a template
  const retryMessage =
    pending?.type === 'intent'
      ? 'Mình chưa hiểu rõ lắm. Em có thể nói cụ thể hơn em muốn tìm hiểu về điều gì không ạ?'
      : `Để mình tư vấn chính xác hơn, em vui lòng cho mình biết thêm: ${(pending?.missing_entities ?? []).join(', ')} nhé!`

  return {
    response_type: 'ask_clarification',
    final_messages: [{ type: 'text', content: retryMessage }],
    // Keep pending_clarification so next turn re-enters the resume loop
  }
}
