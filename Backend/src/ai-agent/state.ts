import { Annotation } from '@langchain/langgraph'
import {
  AgentResponseType,
  ClarificationType,
  Message,
  ReasoningLevel,
} from 'src/common/types'

export interface PendingClarification {
  type: ClarificationType
  original_intent?: string
  original_skill?: string
  missing_entities?: string[]
  question_asked?: string
}

export const AgentStateAnnotation = Annotation.Root({
  //input context
  session_id: Annotation<string>,
  user_message: Annotation<string>,
  conversation_history: Annotation<Message[]>,
  // State & resume management
  is_safe: Annotation<boolean>,
  pending_clarification: Annotation<PendingClarification | null>,
  clarification_resolved: Annotation<boolean>,

  //core reasoning
  intent: Annotation<{ name: string; confident: number | null }>,
  selection_skill: Annotation<string | null>,

  //knowledge management
  retrieval_plan: Annotation<string[] | null>,
  retrieved_knowledge: Annotation<string | null>,

  //reasoning strategy
  reasoning_level: Annotation<ReasoningLevel>,
  need_more_info: Annotation<boolean>,
  response_strategy: Annotation<string | null>,

  //output
  response_type: Annotation<AgentResponseType>,
  final_messages: Annotation<{ type: string; content: string }[] | null>,
})

export type AgentState = typeof AgentStateAnnotation.State
