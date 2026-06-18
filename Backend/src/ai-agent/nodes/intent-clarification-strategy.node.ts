import { AgentState } from '../state'

/**
 * Node 7: Intent Clarification Strategy (Template/Rule)
 * Creates a softer, open question when intent is unclear.
 * Goal: avoid rigid "what do you want to know?" - use User Profile if available
 * and ask only one open-ended question.
 */
export const intentClarificationStrategyNode = (
  state: AgentState,
): Partial<AgentState> => {
  const profile = state.user_profile
  const hasFacts =
    profile && Object.keys(profile.facts ?? {}).length > 0

  let clarificationMessage: string
  if (hasFacts) {
    // Có thông tin nền rồi → tham chiếu và hỏi tiếp
    const summary = Object.entries(profile.facts ?? {})
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ')
    clarificationMessage = `Mình hiểu em đã chia sẻ với mình rằng ${summary}. Vậy hôm nay em muốn mình tư vấn thêm về vấn đề gì dựa trên những thông tin đó nhỉ?`
  } else {
    // Chưa có gì → 1 câu hỏi mở, không rập khuôn
    clarificationMessage =
      'Chào em! Để mình tư vấn sát nhất, em có thể chia sẻ thêm về tình hình học tập, mục tiêu nghề nghiệp, hoặc điều em đang băn khoăn nhất lúc này không?'
  }

  return {
    response_type: 'ask_clarification',
    pending_clarification: {
      type: 'intent',
      question_asked: clarificationMessage,
    },
    final_messages: [{ type: 'text', content: clarificationMessage }],
  }
}
