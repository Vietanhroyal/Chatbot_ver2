import { StateGraph, END, START } from '@langchain/langgraph'
import { AgentStateAnnotation, AgentState } from './state'
import { KnowledgeBaseService } from '../knowledge-base/knowledge-base.service'
import { CorePromptsService } from '../core-prompts/core-prompts.service'
import { SkillsService } from '../core-prompts/skills.service'
import { ResponseStrategiesService } from '../response-strategies/response-strategies.service'
import { OutputValidatorService } from '../common/services/output-validator.service'
import { SecurityLoggerService } from '../common/security-logger.service'
import { SKILLS } from '../common/constants'

import {
  createInputGuardNode,
  injectionDetectionNode,
  conversationResumeNode,
  createClarificationResolutionNode,
  clarificationRetryStrategyNode,
  continuePreviousTaskNode,
  createIntentDetectionNode,
  intentClarificationStrategyNode,
  skillSelectionNode,
  retrievalPlanningNode,
  createKnowledgeRetrievalNode,
  createAdaptiveReasoningNode,
  missingInfoStrategyNode,
  createResponseStrategyNode,
  createResponsePackagingNode,
  userProfileExtractionNode,
} from './nodes'

export interface GraphDeps {
  kbService: KnowledgeBaseService
  corePrompts: CorePromptsService
  skills: SkillsService
  responseStrategies: ResponseStrategiesService
  outputValidator: OutputValidatorService
  securityLogger: SecurityLoggerService
}

export function buildAgentGraph(deps: GraphDeps) {
  const inputGuardNode = createInputGuardNode(deps.securityLogger)
  const knowledgeRetrievalNode = createKnowledgeRetrievalNode(deps.kbService)
  const clarificationResolutionNode = createClarificationResolutionNode(
    deps.corePrompts,
  )
  const intentDetectionNode = createIntentDetectionNode(deps.corePrompts)
  const adaptiveReasoningNode = createAdaptiveReasoningNode(
    deps.corePrompts,
    deps.skills,
  )
  const responseStrategyNode = createResponseStrategyNode(
    deps.corePrompts,
    deps.responseStrategies,
  )
  const responsePackagingNode = createResponsePackagingNode(
    deps.corePrompts,
    deps.outputValidator,
  )

  const workflow = new StateGraph(AgentStateAnnotation)
    .addNode('input_guard', inputGuardNode)
    .addNode('injection_detection', injectionDetectionNode)
    .addNode('conversation_resume', conversationResumeNode)
    .addNode('user_profile_extraction', userProfileExtractionNode)
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

    .addEdge(START, 'input_guard')

    .addConditionalEdges(
      'input_guard',
      (state: AgentState) => {
        return state.is_safe ? 'safe' : 'unsafe'
      },
      {
        safe: 'injection_detection',
        unsafe: 'response_packaging',
      },
    )

    .addConditionalEdges(
      'injection_detection',
      (state: AgentState) => {
        return state.is_safe ? 'safe' : 'unsafe'
      },
      {
        safe: 'conversation_resume',
        unsafe: 'response_packaging',
      },
    )

    .addEdge('clarification_retry_strategy', 'response_packaging')
    .addEdge('continue_previous_task', 'retrieval_planning')
    .addEdge('intent_clarification_strategy', 'response_packaging')
    .addEdge('retrieval_planning', 'knowledge_retrieval')
    .addEdge('knowledge_retrieval', 'adaptive_reasoning')
    .addEdge('missing_info_strategy', 'response_packaging')
    .addEdge('response_strategy_node', 'response_packaging')
    .addEdge('response_packaging', END)

    .addConditionalEdges(
      'conversation_resume',
      (state: AgentState) => {
        return state.pending_clarification ? 'has_pending' : 'no_pending'
      },
      {
        // Both paths go through user_profile_extraction first
        has_pending: 'user_profile_extraction',
        no_pending: 'user_profile_extraction',
      },
    )

    // After extracting profile, branch based on whether there is pending clarification.
    // Using conditional edge avoids parallel execution that causes the
    // "InvalidUpdateError: LastValue can only receive one value per step" crash.
    .addConditionalEdges(
      'user_profile_extraction',
      (state: AgentState) => {
        return state.pending_clarification ? 'has_pending' : 'no_pending'
      },
      {
        has_pending: 'clarification_resolution',
        no_pending: 'intent_detection',
      },
    )

    .addConditionalEdges(
      'clarification_resolution',
      (state: AgentState) => {
        if (!state.clarification_resolved) {
          return 'not_resolved'
        }
        const type = state.pending_clarification?.type
        return type === 'intent' ? 'resolved_intent' : 'resolved_missing_info'
      },
      {
        not_resolved: 'clarification_retry_strategy',
        resolved_intent: 'skill_selection',
        resolved_missing_info: 'continue_previous_task',
      },
    )

    .addConditionalEdges(
      'intent_detection',
      (state: AgentState) => {
        const confidence = state.intent?.confidence ?? 0
        const name = state.intent?.name ?? 'unknown'
        return name !== 'unknown' && confidence >= 0.5 ? 'known' : 'unknown'
      },
      {
        known: 'skill_selection',
        unknown: 'intent_clarification_strategy',
      },
    )

    .addConditionalEdges(
      'skill_selection',
      (state: AgentState) => {
        return state.selected_skill === SKILLS.HUMAN_HANDOFF
          ? 'handoff'
          : 'continue'
      },
      {
        handoff: 'response_packaging',
        continue: 'retrieval_planning',
      },
    )

    .addConditionalEdges(
      'adaptive_reasoning',
      (state: AgentState) => {
        return state.need_more_info ? 'need_info' : 'has_info'
      },
      {
        need_info: 'missing_info_strategy',
        has_info: 'response_strategy_node',
      },
    )

  return workflow.compile()
}
