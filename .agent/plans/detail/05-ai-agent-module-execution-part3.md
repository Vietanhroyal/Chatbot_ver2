# Detailed Execution Plan: `ai-agent/` Module — Part 3
# Graph Builder (`graph.ts`) + Service Update + Smoke Tests

## Pre-requisites
- [ ] Part 1 complete: `state.ts`, Group 1 nodes, service, module
- [ ] Part 2 complete: Group 2 & 3 nodes, `nodes/index.ts` barrel
- [ ] `npm run build` passes

---

## Phase 9: Graph Builder (`graph.ts`)
**Estimated Time:** 30 minutes
**This is the most critical file — it wires the entire 14-node state machine.**

### Task 9.1: Create `src/ai-agent/graph.ts`

```typescript
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

  const workflow = new StateGraph(AgentStateAnnotation);

  // ── Register all 14 nodes ──────────────────────────────────
  workflow.addNode('input_guard', inputGuardNode);
  workflow.addNode('conversation_resume', conversationResumeNode);
  workflow.addNode('clarification_resolution', clarificationResolutionNode);
  workflow.addNode('clarification_retry_strategy', clarificationRetryStrategyNode);
  workflow.addNode('continue_previous_task', continuePreviousTaskNode);
  workflow.addNode('intent_detection', intentDetectionNode);
  workflow.addNode('intent_clarification_strategy', intentClarificationStrategyNode);
  workflow.addNode('skill_selection', skillSelectionNode);
  workflow.addNode('retrieval_planning', retrievalPlanningNode);
  workflow.addNode('knowledge_retrieval', knowledgeRetrievalNode);
  workflow.addNode('adaptive_reasoning', adaptiveReasoningNode);
  workflow.addNode('missing_info_strategy', missingInfoStrategyNode);
  workflow.addNode('response_strategy', responseStrategyNode);
  workflow.addNode('response_packaging', responsePackagingNode);

  // ── Normal Edges ───────────────────────────────────────────
  // START → input_guard
  workflow.addEdge(START, 'input_guard');

  // input_guard → conversation_resume (if safe)
  // Note: if NOT safe, input_guard already sets final_messages,
  // but we still route through packaging for consistency
  workflow.addConditionalEdges('input_guard', (state: AgentState) => {
    return state.is_safe ? 'safe' : 'unsafe';
  }, {
    safe: 'conversation_resume',
    unsafe: 'response_packaging',
  });

  // clarification_retry_strategy → response_packaging
  workflow.addEdge('clarification_retry_strategy', 'response_packaging');

  // continue_previous_task → retrieval_planning
  workflow.addEdge('continue_previous_task', 'retrieval_planning');

  // intent_clarification_strategy → response_packaging
  workflow.addEdge('intent_clarification_strategy', 'response_packaging');

  // retrieval_planning → knowledge_retrieval
  workflow.addEdge('retrieval_planning', 'knowledge_retrieval');

  // knowledge_retrieval → adaptive_reasoning
  workflow.addEdge('knowledge_retrieval', 'adaptive_reasoning');

  // missing_info_strategy → response_packaging
  workflow.addEdge('missing_info_strategy', 'response_packaging');

  // response_strategy → response_packaging
  workflow.addEdge('response_strategy', 'response_packaging');

  // response_packaging → END
  workflow.addEdge('response_packaging', END);

  // ── Conditional Edge 1: Has Pending Clarification? ─────────
  // From: conversation_resume
  workflow.addConditionalEdges('conversation_resume', (state: AgentState) => {
    return state.pending_clarification ? 'has_pending' : 'no_pending';
  }, {
    has_pending: 'clarification_resolution',
    no_pending: 'intent_detection',
  });

  // ── Conditional Edge 2+3: Resolved? + Clarification Type? ──
  // From: clarification_resolution
  workflow.addConditionalEdges('clarification_resolution', (state: AgentState) => {
    if (!state.clarification_resolved) {
      return 'not_resolved';
    }
    // Resolved — check type
    const type = state.pending_clarification?.type;
    return type === 'intent' ? 'resolved_intent' : 'resolved_missing_info';
  }, {
    not_resolved: 'clarification_retry_strategy',
    resolved_intent: 'skill_selection',
    resolved_missing_info: 'continue_previous_task',
  });

  // ── Conditional Edge 4: Is Intent Known? ───────────────────
  // From: intent_detection
  workflow.addConditionalEdges('intent_detection', (state: AgentState) => {
    const confidence = state.intent?.confidence ?? 0;
    const name = state.intent?.name ?? 'unknown';
    return (name !== 'unknown' && confidence >= 0.5) ? 'known' : 'unknown';
  }, {
    known: 'skill_selection',
    unknown: 'intent_clarification_strategy',
  });

  // ── Conditional Edge 5: Is Handoff? ────────────────────────
  // From: skill_selection
  workflow.addConditionalEdges('skill_selection', (state: AgentState) => {
    return state.selected_skill === SKILLS.HUMAN_HANDOFF ? 'handoff' : 'continue';
  }, {
    handoff: 'response_packaging',
    continue: 'retrieval_planning',
  });

  // ── Conditional Edge 6: Need More Info? ────────────────────
  // From: adaptive_reasoning
  workflow.addConditionalEdges('adaptive_reasoning', (state: AgentState) => {
    return state.need_more_info ? 'need_info' : 'has_info';
  }, {
    need_info: 'missing_info_strategy',
    has_info: 'response_strategy',
  });

  // ── Compile ────────────────────────────────────────────────
  return workflow.compile();
}
```

### Task 9.2: Verify
- [ ] `npm run build` passes.
- [ ] All 14 nodes registered.
- [ ] 9 normal edges + 6 conditional edges defined.
- [ ] Matches the Mermaid diagram in `langgraph_flow.md § 4`.

---

## Phase 10: Update `ai-agent.service.ts` to Use the Graph
**Estimated Time:** 10 minutes

### Task 10.1: Replace the stub with the real graph

```typescript
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AgentState, DEFAULT_AGENT_STATE } from './state';
import { buildAgentGraph } from './graph';
import { KnowledgeBaseService } from '../knowledge-base/knowledge-base.service';

@Injectable()
export class AiAgentService implements OnModuleInit {
  private readonly logger = new Logger(AiAgentService.name);
  private compiledGraph: ReturnType<typeof buildAgentGraph> | null = null;

  constructor(private readonly kbService: KnowledgeBaseService) {}

  onModuleInit() {
    this.compiledGraph = buildAgentGraph(this.kbService);
    this.logger.log('AI Agent graph compiled successfully');
  }

  async invoke(input: Partial<AgentState>): Promise<AgentState> {
    if (!this.compiledGraph) {
      throw new Error('Agent graph not initialized');
    }

    const initialState: AgentState = {
      ...DEFAULT_AGENT_STATE,
      ...input,
    };

    this.logger.log(`Invoking agent for session: ${initialState.session_id}`);

    const result = await this.compiledGraph.invoke(initialState);
    return result as AgentState;
  }
}
```

---

## Phase 11: Wire `AiChatService` to Use `AiAgentService`
**Estimated Time:** 10 minutes

### Task 11.1: Update `src/ai-chat/ai-chat.service.ts`

Replace the stub response with the real agent call:

```typescript
import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ChatRequestDto } from './dto/chat-request.dto';
import { ChatResponseDto } from './dto/chat-response.dto';
import { AiAgentService } from '../ai-agent/ai-agent.service';
import { LoggingService } from '../logging/logging.service';
import { ERROR_CODES } from '../common/constants';

@Injectable()
export class AiChatService {
  private readonly logger = new Logger(AiChatService.name);

  constructor(
    private readonly aiAgentService: AiAgentService,
    private readonly loggingService: LoggingService,
  ) {}

  async processMessage(request: ChatRequestDto): Promise<ChatResponseDto> {
    const startTime = Date.now();

    try {
      const finalState = await this.aiAgentService.invoke({
        session_id: request.session_id,
        user_message: request.message,
        conversation_history: request.context?.conversation_history ?? [],
      });

      const latency = Date.now() - startTime;

      const response: ChatResponseDto = {
        session_id: request.session_id,
        intent: finalState.intent ?? { name: 'unknown', confidence: 0 },
        skill: { name: finalState.selected_skill ?? 'fallback_skill' },
        reasoning: {
          level: finalState.reasoning_level ?? 'shallow',
          need_more_info: finalState.need_more_info,
          strategy: finalState.response_strategy ?? 'direct',
        },
        messages: finalState.final_messages ?? [
          { type: 'text', content: 'Xin lỗi, mình chưa có câu trả lời.' },
        ],
        metadata: { latency_ms: latency, model: 'gpt-4o-mini' },
      };

      // Fire-and-forget logging
      this.loggingService.logInteraction({
        sessionId: request.session_id,
        userMessage: request.message,
        intent: response.intent.name,
        intentConfidence: response.intent.confidence,
        skill: response.skill.name,
        reasoningLevel: response.reasoning.level,
        responseType: finalState.response_type,
        latencyMs: latency,
      });

      return response;
    } catch (error) {
      this.logger.error('Agent invocation failed', error);
      throw new HttpException(
        { code: ERROR_CODES.AI_SERVICE_ERROR, message: 'Failed to generate AI response' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
```

### Task 11.2: Update `ai-chat.module.ts` to import `AiAgentModule`

```typescript
import { Module } from '@nestjs/common';
import { AiChatController } from './ai-chat.controller';
import { AiChatService } from './ai-chat.service';
import { AiAgentModule } from '../ai-agent/ai-agent.module';

@Module({
  imports: [AiAgentModule],
  controllers: [AiChatController],
  providers: [AiChatService],
})
export class AiChatModule {}
```

---

## Phase 12: Smoke Test
**Estimated Time:** 15 minutes

### Task 12.1: Test fresh request (Mode A)

```bash
curl -X POST http://localhost:3000/api/v1/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "test_001",
    "channel": "web",
    "message": "Học phí ngành CNTT bao nhiêu?"
  }'
```

**Expected:** Response with `intent.name: "tuition_inquiry"`, `skill.name: "tuition_explanation_skill"`, and relevant messages from KB.

### Task 12.2: Test unknown intent (triggers clarification)

```bash
curl -X POST http://localhost:3000/api/v1/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "test_002",
    "channel": "web",
    "message": "abc xyz"
  }'
```

**Expected:** `intent.name: "unknown"`, response asks for clarification.

### Task 12.3: Test input guard (too long message)

```bash
# Send a message with 2001+ characters
# Expected: 400 validation error from DTO, OR blocked by input guard
```

### Task 12.4: Verify all acceptance criteria
- [ ] Graph compiles on module init (console: "AI Agent graph compiled successfully").
- [ ] All 14 nodes execute without errors.
- [ ] Conditional routing works correctly.
- [ ] `POST /api/v1/ai/chat` returns structured response with intent, skill, messages.
- [ ] Logging shows structured JSON with intent, skill, latency.
- [ ] Error cases return standardized error JSON.
- [ ] `npm run build` passes with zero TypeScript errors.

---

## Full Module Summary (All 3 Parts)

```text
Part 1:
  Phase 1  →  Install deps + folders       (3 min)
  Phase 2  →  state.ts                     (15 min)
  Phase 3  →  5 Group 1 nodes (rule-based) (40 min)
  Phase 4  →  ai-agent.service.ts          (10 min)
  Phase 5  →  ai-agent.module.ts           (3 min)

Part 2:
  Phase 6  →  6 Group 2 nodes (lightweight)(60 min)
  Phase 7  →  3 Group 3 nodes (core LLM)   (40 min)
  Phase 8  →  nodes/index.ts barrel         (3 min)

Part 3:
  Phase 9  →  graph.ts (14 nodes + edges)  (30 min)
  Phase 10 →  Update service with graph     (10 min)
  Phase 11 →  Wire AiChatService            (10 min)
  Phase 12 →  Smoke tests                   (15 min)
──────────────────────────────────────────────────────
Grand Total                                ~239 min (~4 hours)
```

> **After completion:** The full MVP AI Reasoning Core is operational end-to-end!
