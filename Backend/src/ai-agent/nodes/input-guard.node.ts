import { AgentState } from '../state';
import { INPUT_GUARD } from '../../common/constants';

/**
 * Node 1: Input Guard (Rule/Regex)
 * Validates message length and basic spam/injection patterns.
 */
export const inputGuardNode = (state: AgentState): Partial<AgentState> => {
  const msg = state.user_message?.trim() || '';

  // Length check
  if (msg.length < INPUT_GUARD.MIN_MESSAGE_LENGTH ||
      msg.length > INPUT_GUARD.MAX_MESSAGE_LENGTH) {
    return {
      is_safe: false,
      response_type: 'final_answer',
      final_messages: [{
        type: 'text',
        content: 'Tin nhắn không hợp lệ. Vui lòng nhập lại.',
      }],
    };
  }

  // Basic spam/injection patterns
  const spamPatterns = [
    /ignore\s+(all\s+)?previous\s+instructions/i,
    /you\s+are\s+now/i,
    /system\s*:\s*/i,
  ];

  const isSpam = spamPatterns.some((p) => p.test(msg));
  if (isSpam) {
    return {
      is_safe: false,
      response_type: 'final_answer',
      final_messages: [{
        type: 'text',
        content: 'Xin lỗi, mình không thể xử lý tin nhắn này.',
      }],
    };
  }

  return { is_safe: true };
};
