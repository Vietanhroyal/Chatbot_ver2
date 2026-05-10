import { StateGraph, END, START } from '@langchain/langgraph';
import { AgentStateAnnotation, AgentState } from './state';
import { KnowledgeBaseService } from '../knowledge-base/knowledge-base.service';
import { SKILLS } from '../common/constants';

// Import all 14 nodes
import {
  inputGuardNode,
  conversationResumeNode,
  clarificationResolutionNode,
  clarificationRetryStrategyNode,
  continuePreviousTaskNode,
  intentDetectionNode,
  intentClarificationStrategyNode,
  skillSelectionNode,
  retrievalPlanningNode,
  createKnowledgeRetrievalNode,
  adaptiveReasoningNode,
  missingInfoStrategyNode,
  responseStrategyNode,
  responsePackagingNode,
} from './nodes';

/**
 * Builds and compiles the 14-node LangGraph state machine.
 *
 * Architecture reference: langgraph_flow.md § 3 & § 4
 * Reasoning reference: reasoning_flow.md § 3
 *
 * @param kbService - Injected KnowledgeBaseService for RAG
 * @returns Compiled graph ready to invoke
 */
export function buildAgentGraph(kbService: KnowledgeBaseService) {
  const knowledgeRetrievalNode = createKnowledgeRetrievalNode(kbService);

  const workflow = new StateGraph(AgentStateAnnotation)
    // ── Register all 14 nodes ──────────────────────────────────
    .addNode('input_guard', inputGuardNode)
    .addNode('conversation_resume', conversationResumeNode)
    .addNode('clarification_resolution', clarificationResolutionNode)
    .addNode('clarification_retry_strategy', clarificationRetryStrategyNode)
    .addNode('continue_previous_task', continuePreviousTaskNode)
    .addNode('intent_detection', intentDetectionNode)
    .addNode('intent_clarification_strategy', intentClarificationStrategyNode)
    .addNode('skill_selection', skillSelectionNode)
    .addNode('retrieval_planning', retrievalPlanningNode)
    .addNode('knowledge_retrieval', knowledgeRetrievalNode)
    .addNode('adaptive_reasoning', adaptiveReasoningNode)
    .addNode('missing_info_strategy', missingInfoStrategyNode)
    .addNode('response_strategy_node', responseStrategyNode)
    .addNode('response_packaging', responsePackagingNode)

    // ── Normal Edges ───────────────────────────────────────────
    .addEdge(START, 'input_guard')

    .addConditionalEdges('input_guard', (state: AgentState) => {
      return state.is_safe ? 'safe' : 'unsafe';
    }, {
      safe: 'conversation_resume',
      unsafe: 'response_packaging',
    })

    .addEdge('clarification_retry_strategy', 'response_packaging')
    .addEdge('continue_previous_task', 'retrieval_planning')
    .addEdge('intent_clarification_strategy', 'response_packaging')
    .addEdge('retrieval_planning', 'knowledge_retrieval')
    .addEdge('knowledge_retrieval', 'adaptive_reasoning')
    .addEdge('missing_info_strategy', 'response_packaging')
    .addEdge('response_strategy_node', 'response_packaging')
    .addEdge('response_packaging', END)

    // ── Conditional Edge 1: Has Pending Clarification? ─────────
    .addConditionalEdges('conversation_resume', (state: AgentState) => {
      return state.pending_clarification ? 'has_pending' : 'no_pending';
    }, {
      has_pending: 'clarification_resolution',
      no_pending: 'intent_detection',
    })

    // ── Conditional Edge 2+3: Resolved? + Clarification Type? ──
    .addConditionalEdges('clarification_resolution', (state: AgentState) => {
      if (!state.clarification_resolved) {
        return 'not_resolved';
      }
      const type = state.pending_clarification?.type;
      return type === 'intent' ? 'resolved_intent' : 'resolved_missing_info';
    }, {
      not_resolved: 'clarification_retry_strategy',
      resolved_intent: 'skill_selection',
      resolved_missing_info: 'continue_previous_task',
    })

    // ── Conditional Edge 4: Is Intent Known? ───────────────────
    .addConditionalEdges('intent_detection', (state: AgentState) => {
      const confidence = state.intent?.confidence ?? 0;
      const name = state.intent?.name ?? 'unknown';
      return (name !== 'unknown' && confidence >= 0.5) ? 'known' : 'unknown';
    }, {
      known: 'skill_selection',
      unknown: 'intent_clarification_strategy',
    })

    // ── Conditional Edge 5: Is Handoff? ────────────────────────
    .addConditionalEdges('skill_selection', (state: AgentState) => {
      return state.selected_skill === SKILLS.HUMAN_HANDOFF ? 'handoff' : 'continue';
    }, {
      handoff: 'response_packaging',
      continue: 'retrieval_planning',
    })

    // ── Conditional Edge 6: Need More Info? ────────────────────
    .addConditionalEdges('adaptive_reasoning', (state: AgentState) => {
      return state.need_more_info ? 'need_info' : 'has_info';
    }, {
      need_info: 'missing_info_strategy',
      has_info: 'response_strategy_node',
    });

  // ── Compile ────────────────────────────────────────────────
  return workflow.compile();
}
