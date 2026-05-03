# Module 05: `ai-agent/` — LangGraph AI Reasoning Engine

## Overview
This is the core "Brain" of the MVP. It uses LangGraph to define a state machine (graph) consisting of 14 nodes. It executes the reasoning loop, manages conversational context, calls the LLM, and shapes the final response.

## Dependencies
- `@langchain/core`
- `@langchain/langgraph`
- `@langchain/openai`
- `prompts/` directory (for LLM instructions)
- `knowledge-base/` module (for RAG data)

## Priority: **High** (Sprint 2 — Requires scaffolding from Sprint 1)

---

## File 1: `src/ai-agent/state.ts`

### Purpose
Defines the `AgentState` interface used by LangGraph to pass data between nodes.

### Requirements
- Exactly match the interface defined in `langgraph_flow.md`.
- Ensure all fields can be `null` or properly initialized.
- Define the channel/reducer logic if using `@langchain/langgraph`'s `StateGraph` channels (for MVP, a simple replacement reducer for all fields is fine, as it's a linear/branching flow, not a highly parallel one).

### Code Pattern
```typescript
import { StateGraphArgs } from '@langchain/langgraph';

// Define the interface based on langgraph_flow.md
export interface AgentState {
  session_id: string;
  user_message: string;
  // ... all other fields
}

// Define the LangGraph channels (reducers)
export const agentStateChannels: StateGraphArgs<AgentState>["channels"] = {
  session_id: null, // null means overwrite
  user_message: null,
  conversation_history: null,
  is_safe: null,
  pending_clarification: null,
  clarification_resolved: null,
  intent: null,
  selected_skill: null,
  retrieval_plan: null,
  retrieved_knowledge: null,
  reasoning_level: null,
  need_more_info: null,
  response_strategy: null,
  response_type: null,
  final_messages: null,
};
```

---

## File 2: `src/ai-agent/graph.ts`

### Purpose
Constructs the LangGraph `StateGraph`, adds all nodes, defines all conditional and standard edges, and compiles the graph.

### Requirements
- Import all 14 node functions from `nodes/`.
- Instantiate `const workflow = new StateGraph<AgentState>({ channels: agentStateChannels })`.
- Add all nodes: `workflow.addNode("input_guard", inputGuardNode)`.
- Define standard edges: `workflow.addEdge("START", "input_guard")`.
- Define all 7 conditional edges exactly as specified in `langgraph_flow.md`.
- Compile and export the graph.

### Code Pattern (Conditional Edge Example)
```typescript
workflow.addConditionalEdges(
  "conversation_resume",
  (state: AgentState) => {
    return state.pending_clarification ? "has_pending" : "no_pending";
  },
  {
    has_pending: "clarification_resolution",
    no_pending: "intent_detection"
  }
);
```

---

## File 3: `src/ai-agent/ai-agent.service.ts`

### Purpose
The NestJS wrapper that invokes the compiled LangGraph.

### Requirements
- Provide an `invoke(initialState: Partial<AgentState>): Promise<AgentState>` method.
- Initialize missing state fields with `null` or defaults before calling the graph.
- Await `compiledGraph.invoke(state)`.

---

## File 4: `src/ai-agent/nodes/*.node.ts` (14 Files)

### Purpose
Individual files for each of the 14 actions defined in the flow.

### Implementation Strategy per Node Type
#### Group 1: Rule-Based (No LLM)
- `input-guard.node.ts`: Check string length against constants. Set `is_safe`.
- `conversation-resume.node.ts`: Just pass through. State already has `pending_clarification`.
- `continue-previous-task.node.ts`: Restore intent from `pending_clarification.original_intent`.
- `skill-selection.node.ts`: Switch statement matching `state.intent.name` to a skill constant.
- `response-packaging.node.ts`: Transform final LLM string into JSON array of messages based on `\n\n` or specific separators.

#### Group 2: Lightweight (gpt-4o-mini / templates)
- `intent-detection.node.ts`: Call OpenAI with `intent-detection.prompt.ts`. Parse JSON output `{ "name": "...", "confidence": 0.9 }`.
- `clarification-resolution.node.ts`: Call LLM to check if `user_message` answers the `pending_clarification`. Return boolean.
- `retrieval-planning.node.ts`: Extract keywords from message to search KB.

#### Group 3: Core Reasoning (gpt-4o)
- `knowledge-retrieval.node.ts`: Inject KB service, perform search, attach to `state.retrieved_knowledge`.
- `adaptive-reasoning.node.ts`: Call LLM with `reasoning.prompt.ts`, KB data, and history. Decide if `final_answer` or `ask_clarification`. Set `need_more_info` flag.
- `response-strategy.node.ts`: Take drafted answer, apply persona, tone, and empathy.

### Node Code Pattern
```typescript
// src/ai-agent/nodes/skill-selection.node.ts
export const skillSelectionNode = (state: AgentState): Partial<AgentState> => {
  const intentName = state.intent?.name || 'unknown';
  let skill = 'fallback_skill';
  
  if (intentName === 'tuition_inquiry') skill = 'tuition_skill';
  else if (intentName === 'general_faq') skill = 'faq_skill';
  // ...
  
  return { selected_skill: skill };
};
```

---

## Acceptance Criteria
- [ ] Graph compiles without errors.
- [ ] All 14 nodes are implemented and exported.
- [ ] Conditional routing works (e.g., if intent is unknown, it skips to packaging).
- [ ] The full end-to-end flow executes successfully with a mocked LLM.

## Testing Notes
- Unit test nodes individually since they are just functions taking state and returning state updates.
- Test the graph routing logic by passing specific initial states (e.g., test the resume loop by passing a state that already has `pending_clarification` set).
