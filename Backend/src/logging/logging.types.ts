/**
 * Data logged after every chat interaction.
 * Consumed by AiChatService after the agent completes.
 */
export interface InteractionLog {
  sessionId: string
  userMessage: string
  intent: string
  intentConfidence: number
  skill: string
  reasoningLevel: string
  responseType: string
  latencyMs: number
}

/**
 * AI-specific performance metrics.
 * Used for prompt tuning and cost tracking.
 */
export interface AiMetricsLog {
  sessionId: string
  nodeId: string
  model: string
  promptTokens?: number
  completionTokens?: number
  latencyMs: number
  success: boolean
  error?: string
}

/**
 * Knowledge retrieval metrics.
 * Used to evaluate RAG quality.
 */
export interface RetrievalLog {
  sessionId: string
  query: string
  skill: string
  sourcesFound: number
  sources: string[]
  latencyMs: number
}
