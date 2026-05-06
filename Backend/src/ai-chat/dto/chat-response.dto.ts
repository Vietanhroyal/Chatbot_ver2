import { ReasoningLevel } from 'src/common/types'

export class ChatResponseDto {
  session_id: string

  intent: {
    name: string
    confidence: number
  }

  skill: {
    name: string
  }

  reasoning: {
    level: ReasoningLevel
    need_more_info: boolean
    strategy: string
  }

  message: Array<{
    type: string
    content: string
  }>

  metadata?: {
    retrieved_sources?: Array<{
      source_id: string
      title: string
    }>
    latency_ms?: number
    model?: string
  }
}
