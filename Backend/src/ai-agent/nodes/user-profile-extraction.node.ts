import { ChatOpenAI } from '@langchain/openai'
import { AgentState, UserProfile } from '../state'

/**
 * UserProfile extraction prompt — reads conversation history and extracts
 * any facts/preferences/goals/constraints the user has already provided.
 *
 * Goal: prevent the agent from asking for information the user has
 * already shared in earlier messages.
 */
const USER_PROFILE_EXTRACTION_PROMPT = `Bạn là hệ thống trích xuất thông tin người dùng. Nhiệm vụ: đọc lịch sử hội thoại và trích xuất TẤT CẢ thông tin người dùng ĐÃ CUNG CẤP.

## Quy tắc
1. CHỈ trích xuất thông tin người dùng ĐÃ NÓI RÕ, KHÔNG suy đoán.
2. Nếu người dùng nói "tôi hướng ngoại" → ghi facts.personality = "hướng ngoại"
3. Nếu người dùng nói "mục tiêu làm BrSE" → ghi goals = ["làm BrSE"]
4. Nếu người dùng cho điểm → ghi facts.score = "..."
5. KHÔNG trích xuất thông tin bot đã hỏi
6. Output JSON thuần, không giải thích

## Output format (CHỈ JSON)
{
  "facts": {
    "<key>": "<value>"
  },
  "preferences": ["<preference 1>", ...],
  "goals": ["<goal 1>", ...],
  "constraints": ["<constraint 1>", ...]
}

Nếu chưa có thông tin gì, trả về object rỗng: {"facts": {}, "preferences": [], "goals": [], "constraints": []}

## Lịch sử hội thoại
{history}
`.trim()

/**
 * Node: User Profile Extraction
 * Runs at the start of the pipeline to build a UserProfile from history.
 * If LLM fails, returns empty profile (graceful degradation).
 */
export const userProfileExtractionNode = async (
  state: AgentState,
): Promise<Partial<AgentState>> => {
  // Skip if no history to extract from
  if (!state.conversation_history || state.conversation_history.length === 0) {
    return {
      user_profile: { facts: {}, preferences: [], goals: [], constraints: [] },
    }
  }

  const historyStr = state.conversation_history
    .map((m) => `${m.role}: ${m.content}`)
    .join('\n')

  const prompt = USER_PROFILE_EXTRACTION_PROMPT.replace('{history}', historyStr)

  try {
    const llm = new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      temperature: 0,
    })
    const response = await llm.invoke(prompt)
    const content = response.content as string

    // Extract JSON from response (handle possible markdown wrapping)
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return {
        user_profile: { facts: {}, preferences: [], goals: [], constraints: [] },
      }
    }

    const parsed = JSON.parse(jsonMatch[0])
    const profile: UserProfile = {
      facts: parsed.facts ?? {},
      preferences: parsed.preferences ?? [],
      goals: parsed.goals ?? [],
      constraints: parsed.constraints ?? [],
    }

    return { user_profile: profile }
  } catch {
    return {
      user_profile: { facts: {}, preferences: [], goals: [], constraints: [] },
    }
  }
}
