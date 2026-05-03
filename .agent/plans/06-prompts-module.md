# Module 06: `prompts/` — System Prompt Templates

## Overview
This folder contains all the instructional text (prompts) sent to the LLM. Following the coding rules, no large strings are hardcoded into service files. They are separated here for easy tuning and versioning.

## Dependencies
- `@langchain/core/prompts` (SystemMessagePromptTemplate, ChatPromptTemplate)

## Priority: **High** (Sprint 2/3 — Essential for node execution)

---

## File 1: `src/prompts/intent-detection.prompt.ts`

### Purpose
Instructs the lightweight LLM to classify the user's intent.

### Code Pattern
```typescript
import { PromptTemplate } from '@langchain/core/prompts';

export const INTENT_DETECTION_SYSTEM_PROMPT = `
You are an intent classification engine for an educational consulting chatbot.
Analyze the user's message and categorize it into exactly ONE of the following intents:
- tuition_inquiry
- major_inquiry
- major_consultation
- scholarship_inquiry
- general_faq
- human_support_request
- unknown

Return ONLY a valid JSON object matching this schema:
{
  "name": "string", // The intent name
  "confidence": "number" // 0.0 to 1.0
}
`;

export const intentDetectionPrompt = PromptTemplate.fromTemplate(`
${INTENT_DETECTION_SYSTEM_PROMPT}

User Message: {user_message}
Recent History: {history}
`);
```

---

## File 2: `src/prompts/reasoning.prompt.ts`

### Purpose
The core prompt for `adaptive_reasoning_node`. It guides the LLM to evaluate the KB data, find missing slots, and draft the raw answer.

### Code Pattern
```typescript
export const ADAPTIVE_REASONING_PROMPT = `
You are an expert academic consultant. Your goal is to answer the user's query based ONLY on the provided Knowledge Base facts.

Rules:
1. Grounding: If the answer is not in the Knowledge Base, DO NOT guess. 
2. Gap Analysis: If the user asks a complex question (e.g., "Which major is best for me?"), check if you have enough information (e.g., their academic strengths, interests). If not, you MUST ask a clarification question.
3. Tone: Be objective and precise.

Knowledge Base:
{context}

Output format (JSON only):
{
  "response_type": "final_answer" | "ask_clarification",
  "need_more_info": boolean,
  "missing_info_fields": string[] | null,
  "message": "The raw drafted response or clarification question"
}
`;
```

---

## File 3: `src/prompts/response-strategy.prompt.ts`

### Purpose
Instructs the LLM to take the raw drafted message from reasoning and format it nicely for the user, adding empathy.

### Requirements
- Input: Raw message, intent, channel.
- Output: Formatted text ready for packaging.

---

## Files: `src/prompts/skills/*.prompt.ts`

### Purpose
Skill-specific context injected into the reasoning prompt.

### Examples
- `faq.prompt.ts`: "Answer directly and concisely."
- `career-consulting.prompt.ts`: "Use the Holland code or similar frameworks. Ask about strengths in Math, Logic, or Communication before suggesting a major."

---

## Acceptance Criteria
- [ ] All prompts output valid JSON where required by the downstream nodes.
- [ ] Prompts strictly enforce the "Do not guess/hallucinate" rule.
- [ ] No prompts are hardcoded inside the NestJS services or graph nodes.
