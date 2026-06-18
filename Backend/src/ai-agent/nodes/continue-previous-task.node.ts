import { AgentState } from '../state'

/**
 * Node 5: Continue Previous Task (Rule)
 * Restores the original intent and skill from pending_clarification
 * so the graph can resume retrieval where it left off.
 */
export const continuePreviousTaskNode = (
  state: AgentState,
): Partial<AgentState> => {
  const pending = state.pending_clarification

  return {
    intent: pending?.original_intent
      ? { name: pending.original_intent, confidence: 1.0 }
      : state.intent,
    selected_skill: pending?.original_skill ?? state.selected_skill,
    pending_clarification: null,
    clarification_resolved: false,
  }
}
