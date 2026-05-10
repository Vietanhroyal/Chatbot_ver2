import { AgentState } from '../state';

/**
 * Node 14: Response Packaging (Rule/Template)
 * Final node — formats the response into the standard output shape.
 * For MVP: ensures final_messages is populated.
 */
export const responsePackagingNode = (
  state: AgentState,
): Partial<AgentState> => {
  // If final_messages already set (e.g., by input guard or strategy), pass through
  if (state.final_messages && state.final_messages.length > 0) {
    return {};
  }

  // Fallback: wrap response_strategy text into a single message
  if (state.response_strategy) {
    return {
      final_messages: [{ type: 'text', content: state.response_strategy }],
    };
  }

  // Safety net
  return {
    final_messages: [{
      type: 'text',
      content: 'Xin lỗi, mình chưa thể trả lời câu hỏi này. Vui lòng thử lại.',
    }],
  };
};
