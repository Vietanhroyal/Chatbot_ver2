import { AgentState } from '../state'

/**
 * Node 9: Retrieval Planning (Template)
 * Generates search queries for the knowledge base.
 * MVP: Extract keywords from user message + intent.
 */
export const retrievalPlanningNode = (
  state: AgentState,
): Partial<AgentState> => {
  const queries: string[] = []

  // Primary query: the user's message
  queries.push(state.user_message)

  // Secondary query: intent-based keyword
  if (state.intent?.name) {
    queries.push(state.intent.name.replace(/_/g, ' '))
  }

  return { retrieval_plan: queries }
}
