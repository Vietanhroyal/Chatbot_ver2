import { AgentState } from '../state';

/**
 * Node 2: Conversation Resume (Rule)
 * Checks if there is a pending clarification from a previous turn.
 * This node is a pass-through — routing is handled by conditional edges.
 */
export const conversationResumeNode = (
  state: AgentState,
): Partial<AgentState> => {
  // No mutation needed. The conditional edge after this node
  // checks state.pending_clarification to decide the next path.
  return {};
};
