# Detailed Execution Plan: `ai-agent/` Module — Part 2
# Group 2 Nodes (Lightweight LLM) + Group 3 Nodes (Core Reasoning)

## Pre-requisites
- [ ] Part 1 complete: `state.ts`, Group 1 nodes, `ai-agent.service.ts`, `ai-agent.module.ts`
- [ ] `prompts/` module complete (all prompt files available)
- [ ] `knowledge-base/` module complete
- [ ] `npm run build` passes

---

## Phase 6: Group 2 Nodes — Lightweight LLM
**Estimated Time:** 60 minutes total

### Task 6.1: `src/ai-agent/nodes/intent-detection.node.ts`

```typescript
import { ChatOpenAI } from '@langchain/openai';
import { AgentState } from '../state';
import { INTENT_DETECTION_PROMPT } from '../../prompts';
import { INTENTS } from '../../common/constants';

/**
 * Node 6: Intent Detection (Rule + gpt-4o-mini)
 * Classifies the user's message into one of the predefined intents.
 */
export const intentDetectionNode = async (
  state: AgentState,
): Promise<Partial<AgentState>> => {
  const history = state.conversation_history
    .map((m) => `${m.role}: ${m.content}`)
    .join('\n');

  const prompt = INTENT_DETECTION_PROMPT
    .replace('{user_message}', state.user_message)
    .replace('{conversation_history}', history || 'None');

  try {
    const llm = new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      temperature: 0,
    });

    const response = await llm.invoke(prompt);
    const parsed = JSON.parse(response.content as string);

    return {
      intent: {
        name: parsed.name || INTENTS.UNKNOWN,
        confidence: parsed.confidence ?? 0,
      },
    };
  } catch {
    return {
      intent: { name: INTENTS.UNKNOWN, confidence: 0 },
    };
  }
};
```

### Task 6.2: `src/ai-agent/nodes/clarification-resolution.node.ts`

```typescript
import { ChatOpenAI } from '@langchain/openai';
import { AgentState } from '../state';
import { CLARIFICATION_RESOLUTION_PROMPT } from '../../prompts';

/**
 * Node 3: Clarification Resolution (Rule + gpt-4o-mini)
 * Evaluates if the user's reply resolves the pending question.
 */
export const clarificationResolutionNode = async (
  state: AgentState,
): Promise<Partial<AgentState>> => {
  const pending = state.pending_clarification;
  if (!pending) {
    return { clarification_resolved: false };
  }

  const prompt = CLARIFICATION_RESOLUTION_PROMPT
    .replace('{user_message}', state.user_message)
    .replace('{pending_question}', pending.question_asked ?? '')
    .replace('{pending_type}', pending.type)
    .replace('{missing_fields}', (pending.missing_entities ?? []).join(', '));

  try {
    const llm = new ChatOpenAI({ modelName: 'gpt-4o-mini', temperature: 0 });
    const response = await llm.invoke(prompt);
    const parsed = JSON.parse(response.content as string);

    return { clarification_resolved: parsed.resolved === true };
  } catch {
    return { clarification_resolved: false };
  }
};
```

### Task 6.3: `src/ai-agent/nodes/clarification-retry-strategy.node.ts`

```typescript
import { AgentState } from '../state';

/**
 * Node 4: Clarification Retry Strategy (Template)
 * Generates a simpler version of the pending question.
 * No LLM needed — uses templates.
 */
export const clarificationRetryStrategyNode = (
  state: AgentState,
): Partial<AgentState> => {
  const pending = state.pending_clarification;
  const originalQuestion = pending?.question_asked ?? '';

  // Simplify the question with a template
  const retryMessage = pending?.type === 'intent'
    ? 'Mình chưa hiểu rõ lắm. Em có thể nói cụ thể hơn em muốn tìm hiểu về điều gì không ạ?'
    : `Để mình tư vấn chính xác hơn, em vui lòng cho mình biết thêm: ${(pending?.missing_entities ?? []).join(', ')} nhé!`;

  return {
    response_type: 'ask_clarification',
    final_messages: [{ type: 'text', content: retryMessage }],
    // Keep pending_clarification so next turn re-enters the resume loop
  };
};
```

### Task 6.4: `src/ai-agent/nodes/intent-clarification-strategy.node.ts`

```typescript
import { AgentState } from '../state';

/**
 * Node 7: Intent Clarification Strategy (Template/Rule)
 * Creates a question to clarify vague or unknown intents.
 */
export const intentClarificationStrategyNode = (
  state: AgentState,
): Partial<AgentState> => {
  const clarificationMessage =
    'Mình chưa rõ em đang muốn tìm hiểu về vấn đề gì. ' +
    'Em có thể cho mình biết em quan tâm đến: học phí, ngành học, ' +
    'tuyển sinh, hay học bổng không ạ?';

  return {
    response_type: 'ask_clarification',
    pending_clarification: {
      type: 'intent',
      question_asked: clarificationMessage,
    },
    final_messages: [{ type: 'text', content: clarificationMessage }],
  };
};
```

### Task 6.5: `src/ai-agent/nodes/retrieval-planning.node.ts`

```typescript
import { AgentState } from '../state';

/**
 * Node 9: Retrieval Planning (Template)
 * Generates search queries for the knowledge base.
 * MVP: Extract keywords from user message + intent.
 */
export const retrievalPlanningNode = (
  state: AgentState,
): Partial<AgentState> => {
  const queries: string[] = [];

  // Primary query: the user's message
  queries.push(state.user_message);

  // Secondary query: intent-based keyword
  if (state.intent?.name) {
    queries.push(state.intent.name.replace(/_/g, ' '));
  }

  return { retrieval_plan: queries };
};
```

### Task 6.6: `src/ai-agent/nodes/missing-info-strategy.node.ts`

```typescript
import { AgentState } from '../state';

/**
 * Node 12: Missing Info Strategy (Template/Rule)
 * Standardizes the clarification question drafted by adaptive_reasoning.
 * Attaches predefined quick replies if applicable.
 * No LLM needed.
 */
export const missingInfoStrategyNode = (
  state: AgentState,
): Partial<AgentState> => {
  // The adaptive_reasoning_node already drafted the question in response_strategy
  // This node wraps it into the pending_clarification state

  const draftedQuestion = state.response_strategy
    ?? 'Mình cần thêm thông tin để tư vấn chính xác hơn. Em có thể chia sẻ thêm không?';

  return {
    response_type: 'ask_clarification',
    pending_clarification: {
      type: 'missing_info',
      original_intent: state.intent?.name,
      original_skill: state.selected_skill ?? undefined,
      missing_entities: [],
      question_asked: draftedQuestion,
    },
    final_messages: [{ type: 'text', content: draftedQuestion }],
  };
};
```

### Task 6.7: Verify all Group 2 nodes
- [ ] `npm run build` passes.
- [ ] Async nodes (`intentDetectionNode`, `clarificationResolutionNode`) return `Promise<Partial<AgentState>>`.
- [ ] Sync nodes return `Partial<AgentState>`.

---

## Phase 7: Group 3 Nodes — Core Reasoning (LLM)
**Estimated Time:** 40 minutes

### Task 7.1: `src/ai-agent/nodes/knowledge-retrieval.node.ts`

```typescript
import { AgentState } from '../state';
import { KnowledgeBaseService } from '../../knowledge-base/knowledge-base.service';

/**
 * Node 10: Knowledge Retrieval (DB Query)
 * Calls the KnowledgeBaseService to fetch relevant context.
 *
 * Note: This node needs the KB service injected. Since LangGraph nodes
 * are plain functions, we use a factory pattern (closure).
 */
export const createKnowledgeRetrievalNode = (
  kbService: KnowledgeBaseService,
) => {
  return async (state: AgentState): Promise<Partial<AgentState>> => {
    const query = state.retrieval_plan?.[0] ?? state.user_message;
    const skill = state.selected_skill ?? undefined;

    const results = await kbService.search(query, skill);

    const combinedContext = results
      .map((r) => `[Source: ${r.source}]\n${r.content}`)
      .join('\n\n---\n\n');

    return {
      retrieved_knowledge: combinedContext || 'No relevant information found.',
    };
  };
};
```

### Task 7.2: `src/ai-agent/nodes/adaptive-reasoning.node.ts`

```typescript
import { ChatOpenAI } from '@langchain/openai';
import { AgentState } from '../state';
import { ADAPTIVE_REASONING_PROMPT } from '../../prompts';
import { getSkillPrompt } from '../../prompts';

/**
 * Node 11: Adaptive Reasoning — THE BRAIN (gpt-4o-mini)
 * Evaluates RAG data, checks for missing info, drafts the raw answer.
 */
export const adaptiveReasoningNode = async (
  state: AgentState,
): Promise<Partial<AgentState>> => {
  const history = state.conversation_history
    .map((m) => `${m.role}: ${m.content}`)
    .join('\n');

  const skillInstructions = getSkillPrompt(state.selected_skill ?? '');

  const prompt = ADAPTIVE_REASONING_PROMPT
    .replace('{user_message}', state.user_message)
    .replace('{intent}', state.intent?.name ?? 'unknown')
    .replace('{skill}', state.selected_skill ?? 'fallback')
    .replace('{context}', state.retrieved_knowledge ?? 'No context available')
    .replace('{conversation_history}', history || 'None')
    .replace('{skill_instructions}', skillInstructions);

  try {
    const llm = new ChatOpenAI({ modelName: 'gpt-4o-mini', temperature: 0.3 });
    const response = await llm.invoke(prompt);
    const parsed = JSON.parse(response.content as string);

    return {
      need_more_info: parsed.need_more_info === true,
      reasoning_level: parsed.reasoning_level ?? 'shallow',
      response_strategy: parsed.message,
      response_type: parsed.response_type ?? 'final_answer',
    };
  } catch {
    return {
      need_more_info: false,
      reasoning_level: 'shallow',
      response_strategy: 'Xin lỗi, mình gặp lỗi khi xử lý. Vui lòng thử lại.',
      response_type: 'final_answer',
    };
  }
};
```

### Task 7.3: `src/ai-agent/nodes/response-strategy.node.ts`

```typescript
import { ChatOpenAI } from '@langchain/openai';
import { AgentState } from '../state';
import { RESPONSE_STRATEGY_PROMPT } from '../../prompts';

/**
 * Node 13: Response Strategy — THE PRESENTER (gpt-4o-mini)
 * Takes the raw drafted message and shapes it with empathy, tone, splitting.
 * Does NOT re-evaluate business logic.
 */
export const responseStrategyNode = async (
  state: AgentState,
): Promise<Partial<AgentState>> => {
  const rawMessage = state.response_strategy ?? '';

  const prompt = RESPONSE_STRATEGY_PROMPT
    .replace('{raw_message}', rawMessage)
    .replace('{intent}', state.intent?.name ?? 'unknown')
    .replace('{response_type}', state.response_type)
    .replace('{channel}', 'web');

  try {
    const llm = new ChatOpenAI({ modelName: 'gpt-4o-mini', temperature: 0.5 });
    const response = await llm.invoke(prompt);
    const parsed = JSON.parse(response.content as string);

    const messages = (parsed.messages ?? []).map(
      (m: { type: string; content: string }) => ({
        type: 'text' as const,
        content: m.content,
      }),
    );

    return {
      final_messages: messages.length > 0
        ? messages
        : [{ type: 'text', content: rawMessage }],
    };
  } catch {
    // Fallback: use the raw message directly
    return {
      final_messages: [{ type: 'text', content: rawMessage }],
    };
  }
};
```

### Task 7.4: Verify all Group 3 nodes
- [ ] `npm run build` passes.
- [ ] `knowledge-retrieval.node.ts` uses factory pattern (closure) for DI.
- [ ] `adaptive-reasoning.node.ts` uses `ADAPTIVE_REASONING_PROMPT` from prompts module.
- [ ] `response-strategy.node.ts` uses `RESPONSE_STRATEGY_PROMPT` from prompts module.

---

## Phase 8: Nodes Barrel Export

### Task 8.1: Create `src/ai-agent/nodes/index.ts`

```typescript
export { inputGuardNode } from './input-guard.node';
export { conversationResumeNode } from './conversation-resume.node';
export { clarificationResolutionNode } from './clarification-resolution.node';
export { clarificationRetryStrategyNode } from './clarification-retry-strategy.node';
export { continuePreviousTaskNode } from './continue-previous-task.node';
export { intentDetectionNode } from './intent-detection.node';
export { intentClarificationStrategyNode } from './intent-clarification-strategy.node';
export { skillSelectionNode } from './skill-selection.node';
export { retrievalPlanningNode } from './retrieval-planning.node';
export { createKnowledgeRetrievalNode } from './knowledge-retrieval.node';
export { adaptiveReasoningNode } from './adaptive-reasoning.node';
export { missingInfoStrategyNode } from './missing-info-strategy.node';
export { responseStrategyNode } from './response-strategy.node';
export { responsePackagingNode } from './response-packaging.node';
```

---

> **Continue in Part 3:** `graph.ts` (wiring all 14 nodes + 7 conditional edges), updating `ai-agent.service.ts`, and final smoke tests.
