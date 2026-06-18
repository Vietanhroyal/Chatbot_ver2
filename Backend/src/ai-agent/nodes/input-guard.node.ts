import { AgentState } from '../state'
import { INPUT_GUARD } from '../../common/constants'
import { SecurityLoggerService } from '../../common/security-logger.service'

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?)/i,
  /forget\s+(everything|all|previous)/i,
  /disregard\s+(all|the|any)/i,
  /you\s+are\s+(now|actually|really)/i,
  /new\s+(role|persona|instructions?)/i,
  /(act|pretend|behave)\s+(as|like)\s+(a|an)/i,
  /system\s*[:]\s*/i,
  /assistant\s*[:]\s*/i,
  /(print|show|reveal|output|display)\s+(your|the)\s+(system|initial|original)\s+(prompt|instructions?)/i,
  /what\s+(is|are)\s+your\s+((system\s+)?instructions?|rules?|system\s+prompt)/i,
  /DAN\b|jailbreak|bypass|exploit/i,
  /decode\s+(this|the\s+following)/i,
  /base64\s*[:]/i,
]

export const createInputGuardNode = (securityLogger: SecurityLoggerService) => {
  return (state: AgentState): Partial<AgentState> => {
    const msg = state.user_message?.trim() || ''

    if (
      msg.length < INPUT_GUARD.MIN_MESSAGE_LENGTH ||
      msg.length > INPUT_GUARD.MAX_MESSAGE_LENGTH
    ) {
      return {
        is_safe: false,
        response_type: 'final_answer',
        final_messages: [
          {
            type: 'text',
            content: 'Tin nhắn không hợp lệ. Vui lòng nhập lại.',
          },
        ],
      }
    }

    const matchedPattern = INJECTION_PATTERNS.find(p => p.test(msg))
    if (matchedPattern) {
      securityLogger.log({
        event: 'injection_blocked',
        pattern: matchedPattern.toString(),
        session_id: state.session_id,
        user_message_preview: msg.substring(0, 100),
        timestamp: new Date().toISOString(),
      })

      return {
        is_safe: false,
        response_type: 'final_answer',
        final_messages: [
          {
            type: 'text',
            content: 'Xin lỗi, mình không thể xử lý tin nhắn này.',
          },
        ],
      }
    }

    return { is_safe: true }
  }
}
