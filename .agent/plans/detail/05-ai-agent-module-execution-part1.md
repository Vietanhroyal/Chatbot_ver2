# Detailed Execution Plan: `ai-agent/` Module — Part 1
# State, Service, Module + Group 1 Nodes (Rule-Based)

## Pre-requisites
- [ ] All Sprint 1 modules complete (common, config, health, ai-chat, knowledge-base, logging, prompts)
- [ ] `npm install @langchain/core @langchain/langgraph @langchain/openai`
- [ ] `npm run build` passes

---

## Phase 1: Install Dependencies & Create Folders
**Estimated Time:** 3 minutes

```bash
npm install @langchain/core @langchain/langgraph @langchain/openai
```

```text
src/
└── ai-agent/
    ├── ai-agent.module.ts
    ├── ai-agent.service.ts
    ├── state.ts
    ├── graph.ts
    └── nodes/
        ├── input-guard.node.ts
        ├── conversation-resume.node.ts
        ├── clarification-resolution.node.ts
        ├── clarification-retry-strategy.node.ts
        ├── continue-previous-task.node.ts
        ├── intent-detection.node.ts
        ├── intent-clarification-strategy.node.ts
        ├── skill-selection.node.ts
        ├── retrieval-planning.node.ts
        ├── knowledge-retrieval.node.ts
        ├── adaptive-reasoning.node.ts
        ├── missing-info-strategy.node.ts
        ├── response-strategy.node.ts
        └── response-packaging.node.ts
```

---

## Phase 2: Agent State (`state.ts`)
**Estimated Time:** 15 minutes
**Why first:** Every node and the graph depend on this interface.

### Task 2.1: Create `src/ai-agent/state.ts`

```typescript
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
  response_strategy: null,
  response_type: 'final_answer',
  final_messages: null,
};
```

### Task 2.2: Verify
- [ ] `npm run build` passes.
- [ ] All fields match `langgraph_flow.md` § 2.

---

## Phase 3: Group 1 Nodes — Rule-Based (No LLM)
**Estimated Time:** 40 minutes total

### Task 3.1: `src/ai-agent/nodes/input-guard.node.ts`

```typescript
import { AgentState } from '../state';
import { INPUT_GUARD } from '../../common/constants';

/**
 * Node 1: Input Guard (Rule/Regex)
 * Validates message length and basic spam/injection patterns.
 */
export const inputGuardNode = (state: AgentState): Partial<AgentState> => {
  const msg = state.user_message?.trim() || '';

  // Length check
  if (msg.length < INPUT_GUARD.MIN_MESSAGE_LENGTH ||
      msg.length > INPUT_GUARD.MAX_MESSAGE_LENGTH) {
    return {
      is_safe: false, 
      response_type: 'final_answer',
      final_messages: [{
        type: 'text',
        content: 'Tin nhắn không hợp lệ. Vui lòng nhập lại.',
      }],
    };
  }

  // Basic spam/injection patterns
  const spamPatterns = [
    /ignore\s+(all\s+)?previous\s+instructions/i,
    /you\s+are\s+now/i,
    /system\s*:\s*/i,
  ];

  const isSpam = spamPatterns.some((p) => p.test(msg));
  if (isSpam) {
    return {
      is_safe: false,
      response_type: 'final_answer',
      final_messages: [{
        type: 'text',
        content: 'Xin lỗi, mình không thể xử lý tin nhắn này.',
      }],
    };
  }

  return { is_safe: true };
};
```

### Task 3.2: `src/ai-agent/nodes/conversation-resume.node.ts`

```typescript
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
```

### Task 3.3: `src/ai-agent/nodes/continue-previous-task.node.ts`

```typescript
import { AgentState } from '../state';

/**
 * Node 5: Continue Previous Task (Rule)
 * Restores the original intent and skill from pending_clarification
 * so the graph can resume retrieval where it left off.
 */
export const continuePreviousTaskNode = (
  state: AgentState,
): Partial<AgentState> => {
  const pending = state.pending_clarification;

  return {
    intent: pending?.original_intent
      ? { name: pending.original_intent, confidence: 1.0 }
      : state.intent,
    selected_skill: pending?.original_skill ?? state.selected_skill,
    pending_clarification: null,
    clarification_resolved: false,
  };
};
```

### Task 3.4: `src/ai-agent/nodes/skill-selection.node.ts`

```typescript
import { AgentState } from '../state';
import { INTENTS, SKILLS } from '../../common/constants';

/**
 * Intent → Skill mapping table.
 * Rule-based, no LLM needed.
 */
const INTENT_TO_SKILL: Record<string, string> = {
  [INTENTS.GENERAL_FAQ]: SKILLS.FAQ,
  [INTENTS.TUITION_INQUIRY]: SKILLS.TUITION,
  [INTENTS.MAJOR_INQUIRY]: SKILLS.MAJOR_INFO,
  [INTENTS.MAJOR_CONSULTATION]: SKILLS.CAREER_CONSULTING,
  [INTENTS.SCHOLARSHIP_INQUIRY]: SKILLS.SCHOLARSHIP,
  [INTENTS.ADMISSION_METHOD_INQUIRY]: SKILLS.FAQ,
  [INTENTS.DEADLINE_INQUIRY]: SKILLS.FAQ,
  [INTENTS.HUMAN_SUPPORT_REQUEST]: SKILLS.HUMAN_HANDOFF,
  [INTENTS.UNKNOWN]: SKILLS.FALLBACK,
};

/**
 * Node 8: Skill Selection (Rule)
 * Maps the detected intent to a specific consulting skill.
 */
export const skillSelectionNode = (
  state: AgentState,
): Partial<AgentState> => {
  const intentName = state.intent?.name ?? INTENTS.UNKNOWN;
  const skill = INTENT_TO_SKILL[intentName] ?? SKILLS.FALLBACK;

  return { selected_skill: skill };
};
```

### Task 3.5: `src/ai-agent/nodes/response-packaging.node.ts`

```typescript
import { AgentState } from '../state';

/**
 * Node 14: Response Packaging (Rule/Template)
 * Final node — formats the response into the standard output shape.
 * For MVP: ensures final_messages is populated.
 */
export const responsePackagingNode = (
  state: AgentState,
): Partial<AgentState> => {
  // If final_messages already set (e.g., by input guard or strategy), pass through
  if (state.final_messages && state.final_messages.length > 0) {
    return {};
  }

  // Fallback: wrap response_strategy text into a single message
  if (state.response_strategy) {
    return {
      final_messages: [{ type: 'text', content: state.response_strategy }],
    };
  }

  // Safety net
  return {
    final_messages: [{
      type: 'text',
      content: 'Xin lỗi, mình chưa thể trả lời câu hỏi này. Vui lòng thử lại.',
    }],
  };
};
```

### Task 3.6: Verify all Group 1 nodes
- [ ] `npm run build` passes.
- [ ] All 5 nodes export a function with signature `(state: AgentState) => Partial<AgentState>`.

---

## Phase 4: AI Agent Service (`ai-agent.service.ts`)
**Estimated Time:** 10 minutes

### Task 4.1: Create `src/ai-agent/ai-agent.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { AgentState, DEFAULT_AGENT_STATE } from './state';

/**
 * NestJS service wrapper for the LangGraph compiled graph.
 * Entry point: invoke(partialState) → Promise<AgentState>
 *
 * The actual graph is wired in Phase 7 (graph.ts).
 * For now, this provides the interface that AiChatService depends on.
 */
@Injectable()
export class AiAgentService {
  private readonly logger = new Logger(AiAgentService.name);
  // TODO: Inject compiled graph in Phase 7
  // private readonly graph: CompiledStateGraph<AgentState>;

  /**
   * Run the full AI reasoning pipeline.
   * @param input - Partial state with at minimum session_id and user_message
   * @returns The completed agent state with final_messages populated
   */
  async invoke(input: Partial<AgentState>): Promise<AgentState> {
    const initialState: AgentState = {
      ...DEFAULT_AGENT_STATE,
      ...input,
    };

    this.logger.log(`Invoking agent for session: ${initialState.session_id}`);

    // TODO: Replace with graph.invoke(initialState) in Phase 7
    // const result = await this.graph.invoke(initialState);
    // return result;

    // Stub: return the initial state with a placeholder message
    return {
      ...initialState,
      response_type: 'final_answer',
      final_messages: [{
        type: 'text',
        content: `[Agent Stub] Received: "${initialState.user_message}"`,
      }],
    };
  }
}
```

---

## Phase 5: AI Agent Module (`ai-agent.module.ts`)
**Estimated Time:** 3 minutes

### Task 5.1: Create `src/ai-agent/ai-agent.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { AiAgentService } from './ai-agent.service';
import { KnowledgeBaseModule } from '../knowledge-base/knowledge-base.module';

@Module({
  imports: [KnowledgeBaseModule],
  providers: [AiAgentService],
  exports: [AiAgentService],
})
export class AiAgentModule {}
```

### Task 5.2: Register in `app.module.ts`

Add `AiAgentModule` to imports and wire `AiChatService` to use `AiAgentService`.

---

## Phase 5 Summary & What's Next

```text
Phase 1  →  Install deps + folders     (3 min)
Phase 2  →  state.ts (AgentState)       (15 min)
Phase 3  →  5 Group 1 nodes            (40 min)
Phase 4  →  ai-agent.service.ts        (10 min)
Phase 5  →  ai-agent.module.ts         (3 min)
────────────────────────────────────────────────
Part 1 Total                           ~71 min
```

> **Continue in Part 2:** Group 2 nodes (LLM-lightweight), Group 3 nodes (core reasoning), and `graph.ts` (wiring all edges).
