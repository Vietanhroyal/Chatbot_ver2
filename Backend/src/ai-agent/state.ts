import { Annotation } from '@langchain/langgraph';
import { Message, ReasoningLevel, AgentResponseType, ClarificationType } from '../common/types';

/**
 * Pending clarification state.
 * Stored when the bot asks a question and waits for user reply.
 */
export interface PendingClarification {
  type: ClarificationType;
  original_intent?: string;
  original_skill?: string;
  missing_entities?: string[];
  question_asked?: string;
}

/**
 * LangGraph Agent State — the single source of truth flowing through all 14 nodes.
 * Matches the contract in langgraph_flow.md § 2.
 *
 * Uses LangGraph's Annotation API for channel/reducer definitions.
 */
export const AgentStateAnnotation = Annotation.Root({
  // 1. Input Context
  session_id: Annotation<string>,
  user_message: Annotation<string>,
  conversation_history: Annotation<Message[]>,

  // 2. State & Resume Management
  is_safe: Annotation<boolean>,
  pending_clarification: Annotation<PendingClarification | null>,
  clarification_resolved: Annotation<boolean>,

  // 3. Core Reasoning State
  intent: Annotation<{ name: string; confidence: number } | null>,
  selected_skill: Annotation<string | null>,

  // 4 & 5. Knowledge
  retrieval_plan: Annotation<string[] | null>,
  retrieved_knowledge: Annotation<string | null>,

  // 6 & 7. Reasoning & Strategy
  reasoning_level: Annotation<ReasoningLevel | null>,
  need_more_info: Annotation<boolean>,
  missing_info_fields: Annotation<string[] | null>,
  response_strategy: Annotation<string | null>,

  // 8. Output
  response_type: Annotation<AgentResponseType>,
  final_messages: Annotation<{ type: 'text'; content: string }[] | null>,
});

/** TypeScript type extracted from the annotation */
export type AgentState = typeof AgentStateAnnotation.State;

/**
 * Default initial state values.
 * Used by AiAgentService to fill missing fields before graph invocation.
 */
export const DEFAULT_AGENT_STATE: AgentState = {
  session_id: '',
  user_message: '',
  conversation_history: [],
  is_safe: true,
  pending_clarification: null,
  clarification_resolved: false,
  intent: null,
  selected_skill: null,
  retrieval_plan: null,
  retrieved_knowledge: null,
  reasoning_level: null,
  need_more_info: false,
  missing_info_fields: null,
  response_strategy: null,
  response_type: 'final_answer',
  final_messages: null,
};
