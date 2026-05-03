# Detailed Execution Plan: `prompts/` Module

## Pre-requisites
- [ ] `common/` module is complete (intent & skill constants)
- [ ] Familiarity with docs: `intent_design.md`, `skill_design.md`, `reasoning_flow.md`, `response_strategy.md`
- [ ] `npm run build` passes

---

## Phase 1: Create Folder Structure
**Estimated Time:** 1 minute

```text
src/
└── prompts/
    ├── intent-detection.prompt.ts
    ├── clarification-resolution.prompt.ts
    ├── reasoning.prompt.ts
    ├── response-strategy.prompt.ts
    ├── response-packaging.prompt.ts
    └── skills/
        ├── faq.prompt.ts
        ├── tuition.prompt.ts
        ├── major-info.prompt.ts
        ├── career-consulting.prompt.ts
        ├── persuasion.prompt.ts
        └── human-handoff.prompt.ts
```

---

## Phase 2: Intent Detection Prompt
**Estimated Time:** 10 minutes

### Task 2.1: Create `src/prompts/intent-detection.prompt.ts`

```typescript
/**
 * System prompt for the intent-detection node.
 * Model: gpt-4o-mini (lightweight, fast)
 *
 * Input variables: {user_message}, {conversation_history}
 * Expected output: JSON { name: string, confidence: number }
 */
export const INTENT_DETECTION_PROMPT = `
You are an intent classification engine for a Vietnamese educational consulting chatbot.

## Task
Analyze the user's message and classify it into exactly ONE intent.

## Available Intents
- "tuition_inquiry": Asking about tuition fees, payment methods, or financial aid.
- "major_inquiry": Asking for factual information about a specific major/program.
- "major_consultation": Seeking advice or consultation on choosing a major/career path.
- "scholarship_inquiry": Asking about scholarship opportunities, requirements, or eligibility.
- "admission_method_inquiry": Asking about admission methods (e.g., học bạ, thi THPT).
- "deadline_inquiry": Asking about registration or application deadlines.
- "general_faq": General questions (campus, dormitory, contact info, etc.).
- "human_support_request": Explicitly requesting to talk to a human consultant.
- "unknown": Cannot determine the intent from the message.

## Rules
1. Choose the MOST specific intent. For example, "học phí ngành CNTT" is "tuition_inquiry", not "major_inquiry".
2. If the message is ambiguous between 2 intents, pick the one with higher confidence and set confidence lower (< 0.7).
3. If the message is completely unrelated to education/admissions, return "unknown".
4. Respond in JSON only. No explanation text.

## Output Format (JSON only)
{
  "name": "<intent_name>",
  "confidence": <0.0 to 1.0>
}

## Conversation History
{conversation_history}

## User Message
{user_message}
`.trim();
```

---

## Phase 3: Clarification Resolution Prompt
**Estimated Time:** 8 minutes

### Task 3.1: Create `src/prompts/clarification-resolution.prompt.ts`

```typescript
/**
 * System prompt for the clarification-resolution node.
 * Model: gpt-4o-mini
 *
 * Evaluates whether the user's new message actually answers
 * the pending clarification question.
 *
 * Input variables: {user_message}, {pending_question}, {pending_type}, {missing_fields}
 * Expected output: JSON { resolved: boolean, extracted_data: object | null }
 */
export const CLARIFICATION_RESOLUTION_PROMPT = `
You are evaluating whether a user's reply answers a previously asked clarification question.

## Pending Question
Type: {pending_type}
Question asked: "{pending_question}"
Fields we need: {missing_fields}

## User's Reply
"{user_message}"

## Task
1. Determine if the user's reply provides the information we asked for.
2. If YES: Extract the relevant data from their reply.
3. If NO: The user may have changed topic, given an irrelevant answer, or said "I don't know".

## Output Format (JSON only)
{
  "resolved": true | false,
  "extracted_data": {
    "<field_name>": "<extracted_value>"
  } | null,
  "reasoning": "Brief explanation of your decision"
}
`.trim();
```

---

## Phase 4: Adaptive Reasoning Prompt
**Estimated Time:** 15 minutes
**Most critical prompt — the "brain" of the chatbot.**

### Task 4.1: Create `src/prompts/reasoning.prompt.ts`

```typescript
/**
 * System prompt for the adaptive-reasoning node (The Brain).
 * Model: gpt-4o (or gpt-4o-mini for cost savings)
 *
 * This is the CORE intelligence prompt. It evaluates RAG data,
 * identifies missing information, and drafts the raw answer.
 *
 * Input variables: {user_message}, {intent}, {skill}, {context},
 *                  {conversation_history}, {skill_instructions}
 * Expected output: JSON with response_type, need_more_info, message, etc.
 */
export const ADAPTIVE_REASONING_PROMPT = `
You are an expert academic consultant for a Vietnamese university.
Your job is to draft an accurate, helpful response based ONLY on the provided Knowledge Base.

## Strict Rules
1. **Grounding**: ONLY use facts from the Knowledge Base below. If the answer is NOT in the Knowledge Base, you MUST say you don't have that information — NEVER make up facts.
2. **Gap Analysis**: If the user's question requires specific details you don't have (e.g., which admission method they want, their academic strengths), you MUST ask a clarification question instead of guessing.
3. **Completeness**: Check that all required business slots are filled before answering complex queries.
4. **Language**: Respond in Vietnamese. Use a friendly, professional tone.

## Current Context
- **User Intent**: {intent}
- **Selected Skill**: {skill}
- **Conversation History**: {conversation_history}

## Skill-Specific Instructions
{skill_instructions}

## Knowledge Base (Retrieved Context)
{context}

## User Message
"{user_message}"

## Output Format (JSON only)
If you CAN answer fully:
{
  "response_type": "final_answer",
  "need_more_info": false,
  "missing_info_fields": null,
  "message": "Your drafted answer in Vietnamese",
  "used_sources": ["source_id_1"],
  "reasoning_level": "shallow" | "medium" | "deep"
}

If you NEED more information:
{
  "response_type": "ask_clarification",
  "need_more_info": true,
  "missing_info_fields": ["field_name_1", "field_name_2"],
  "message": "Your clarification question in Vietnamese",
  "used_sources": [],
  "reasoning_level": "deep"
}
`.trim();
```

---

## Phase 5: Response Strategy Prompt
**Estimated Time:** 10 minutes

### Task 5.1: Create `src/prompts/response-strategy.prompt.ts`

```typescript
/**
 * System prompt for the response-strategy node (The Presenter).
 * Model: gpt-4o-mini
 *
 * Takes the RAW drafted message from adaptive-reasoning
 * and shapes it into a natural, multi-message conversation.
 * Does NOT re-evaluate business logic.
 *
 * Input variables: {raw_message}, {intent}, {response_type}, {channel}
 * Expected output: JSON with messages array
 */
export const RESPONSE_STRATEGY_PROMPT = `
You are a message formatting engine for a Vietnamese educational chatbot.
Your job is to take a raw drafted answer and format it into natural, human-like messages.

## Persona
- Friendly admission consultant ("anh/chị tư vấn")
- Empathetic and approachable
- Professional but not robotic

## Rules
1. Split the response into 2-3 short messages (like texting, not an essay).
2. First message: Acknowledge/empathize ("Dạ, mình hiểu...").
3. Middle message(s): Main content.
4. Last message: Call-to-action or offer further help.
5. Keep each message under 300 characters.
6. Use Vietnamese naturally (not overly formal).
7. Do NOT add new facts — only reshape the existing content.

## Input
- Response Type: {response_type}
- Intent: {intent}
- Channel: {channel}
- Raw Message: "{raw_message}"

## Output Format (JSON only)
{
  "messages": [
    { "type": "empathy", "content": "..." },
    { "type": "main_answer", "content": "..." },
    { "type": "cta", "content": "..." }
  ],
  "quick_replies": ["Option 1", "Option 2"] | null
}
`.trim();
```

---

## Phase 6: Response Packaging Prompt
**Estimated Time:** 5 minutes

### Task 6.1: Create `src/prompts/response-packaging.prompt.ts`

```typescript
/**
 * This node is RULE-BASED (no LLM call).
 * This file contains the template/constants used by the
 * response-packaging node for channel-specific formatting.
 *
 * No LLM prompt needed — just export formatting constants.
 */

/** Maximum characters per message bubble */
export const MAX_MESSAGE_LENGTH = 500;

/** Default quick replies when no specific ones are provided */
export const DEFAULT_QUICK_REPLIES = [
  'Tìm hiểu thêm',
  'Liên hệ tư vấn viên',
];

/** Channel-specific formatting rules */
export const CHANNEL_CONFIG = {
  web: {
    supportsQuickReplies: true,
    supportsImages: true,
    maxMessages: 5,
  },
  facebook: {
    supportsQuickReplies: true,
    supportsImages: true,
    maxMessages: 3,
  },
  zalo: {
    supportsQuickReplies: true,
    supportsImages: false,
    maxMessages: 3,
  },
  api: {
    supportsQuickReplies: false,
    supportsImages: false,
    maxMessages: 10,
  },
} as const;
```

---

## Phase 7: Skill Prompts (`skills/*.prompt.ts`)
**Estimated Time:** 20 minutes

### Task 7.1: Create `src/prompts/skills/faq.prompt.ts`

```typescript
/**
 * Skill instructions injected into the reasoning prompt
 * when the selected skill is "faq_skill".
 */
export const FAQ_SKILL_INSTRUCTIONS = `
## FAQ Skill Instructions
- Answer directly and concisely.
- Use the exact information from the FAQ knowledge base.
- If there are multiple matching FAQs, provide the most relevant one.
- Keep the answer short (1-2 sentences).
- Do not add unnecessary elaboration.
`.trim();
```

### Task 7.2: Create `src/prompts/skills/tuition.prompt.ts`

```typescript
/**
 * Skill instructions for "tuition_explanation_skill".
 */
export const TUITION_SKILL_INSTRUCTIONS = `
## Tuition Skill Instructions
- Present tuition fees clearly with exact numbers.
- Always mention the fee period (per semester or per year).
- If the user asks about a specific major, show only that major's fee.
- Mention available financial support options (scholarships, loans, installments).
- If the user expresses concern about cost, transition to a supportive tone and highlight payment options.
`.trim();
```

### Task 7.3: Create `src/prompts/skills/major-info.prompt.ts`

```typescript
/**
 * Skill instructions for "major_information_skill".
 */
export const MAJOR_INFO_SKILL_INSTRUCTIONS = `
## Major Information Skill Instructions
- Provide factual details: program code, duration, admission combos, career prospects.
- Structure the information clearly with bullet points in your draft.
- If the user asks about a major not in the knowledge base, say so honestly.
- Do not compare majors unless the user explicitly asks for comparison.
`.trim();
```

### Task 7.4: Create `src/prompts/skills/career-consulting.prompt.ts`

```typescript
/**
 * Skill instructions for "career_consulting_skill".
 * This is the most complex skill — requires multi-turn reasoning.
 */
export const CAREER_CONSULTING_SKILL_INSTRUCTIONS = `
## Career Consulting Skill Instructions
- This is a DEEP reasoning task. Do NOT give a quick answer.
- Before recommending a major, you MUST know at least 2 of these:
  1. The student's academic strengths (Math, English, Logic, Communication)
  2. Their personal interests or hobbies
  3. Their career goals or family expectations
- If any of the above are missing, ask a clarification question.
- When recommending, explain WHY that major fits their profile.
- Mention career prospects and job market demand.
- Never recommend more than 2-3 majors at once.
`.trim();
```

### Task 7.5: Create `src/prompts/skills/persuasion.prompt.ts`

```typescript
/**
 * Skill instructions for "persuasion_skill".
 * Activated when the user shows hesitation or objections.
 */
export const PERSUASION_SKILL_INSTRUCTIONS = `
## Persuasion Skill Instructions
- The user is showing hesitation or objecting (e.g., "too expensive", "not sure if worth it").
- Do NOT be aggressive or pushy.
- Acknowledge their concern genuinely.
- Provide counter-evidence from the knowledge base (e.g., scholarships, ROI, career outcomes).
- Use social proof if available (e.g., "Many students in similar situations...").
- End with an open question to keep the conversation going.
`.trim();
```

### Task 7.6: Create `src/prompts/skills/human-handoff.prompt.ts`

```typescript
/**
 * Skill instructions for "human_handoff_skill".
 * Activated when the user explicitly requests a human consultant.
 */
export const HUMAN_HANDOFF_SKILL_INSTRUCTIONS = `
## Human Handoff Skill Instructions
- The user wants to speak with a real person.
- Acknowledge their request warmly.
- Summarize the conversation context so far (what they asked about).
- Provide contact information (hotline, email) from the FAQ knowledge base.
- Let them know expected response time if available.
- This is a terminal skill — after handoff, the conversation ends with the bot.
`.trim();
```

---

## Phase 8: Create a Skill Prompt Index
**Estimated Time:** 5 minutes

### Task 8.1: Create `src/prompts/skills/index.ts`

```typescript
import { SKILLS } from '../../common/constants';
import { FAQ_SKILL_INSTRUCTIONS } from './faq.prompt';
import { TUITION_SKILL_INSTRUCTIONS } from './tuition.prompt';
import { MAJOR_INFO_SKILL_INSTRUCTIONS } from './major-info.prompt';
import { CAREER_CONSULTING_SKILL_INSTRUCTIONS } from './career-consulting.prompt';
import { PERSUASION_SKILL_INSTRUCTIONS } from './persuasion.prompt';
import { HUMAN_HANDOFF_SKILL_INSTRUCTIONS } from './human-handoff.prompt';

/**
 * Maps a skill name to its corresponding prompt instructions.
 * Used by the adaptive-reasoning node to inject skill-specific context.
 */
const SKILL_PROMPT_MAP: Record<string, string> = {
  [SKILLS.FAQ]: FAQ_SKILL_INSTRUCTIONS,
  [SKILLS.TUITION]: TUITION_SKILL_INSTRUCTIONS,
  [SKILLS.MAJOR_INFO]: MAJOR_INFO_SKILL_INSTRUCTIONS,
  [SKILLS.CAREER_CONSULTING]: CAREER_CONSULTING_SKILL_INSTRUCTIONS,
  [SKILLS.PERSUASION]: PERSUASION_SKILL_INSTRUCTIONS,
  [SKILLS.HUMAN_HANDOFF]: HUMAN_HANDOFF_SKILL_INSTRUCTIONS,
};

/**
 * Get the skill-specific prompt instructions for a given skill.
 * Returns a fallback instruction if the skill is not found.
 */
export function getSkillPrompt(skillName: string): string {
  return SKILL_PROMPT_MAP[skillName] ?? 'Answer based on the knowledge base.';
}
```

---

## Phase 9: Create a Root Prompt Index
**Estimated Time:** 3 minutes

### Task 9.1: Create `src/prompts/index.ts`

```typescript
export { INTENT_DETECTION_PROMPT } from './intent-detection.prompt';
export { CLARIFICATION_RESOLUTION_PROMPT } from './clarification-resolution.prompt';
export { ADAPTIVE_REASONING_PROMPT } from './reasoning.prompt';
export { RESPONSE_STRATEGY_PROMPT } from './response-strategy.prompt';
export {
  MAX_MESSAGE_LENGTH,
  DEFAULT_QUICK_REPLIES,
  CHANNEL_CONFIG,
} from './response-packaging.prompt';
export { getSkillPrompt } from './skills';
```

---

## Phase 10: Verify & Smoke Test
**Estimated Time:** 5 minutes

### Task 10.1: Build check

```bash
npm run build
```

### Task 10.2: Quick import test

Temporarily add to any existing file:

```typescript
import { getSkillPrompt, INTENT_DETECTION_PROMPT } from '../prompts';

console.log('Intent prompt length:', INTENT_DETECTION_PROMPT.length);
console.log('FAQ skill prompt:', getSkillPrompt('faq_skill'));
console.log('Unknown skill:', getSkillPrompt('nonexistent_skill'));
```

**Expected output:**
```text
Intent prompt length: ~1200
FAQ skill prompt: ## FAQ Skill Instructions...
Unknown skill: Answer based on the knowledge base.
```

Remove the temporary test code after verification.

### Task 10.3: Verify all acceptance criteria
- [ ] All 11 prompt files exist and compile.
- [ ] `getSkillPrompt()` returns correct prompt for every skill in `SKILLS` constant.
- [ ] `getSkillPrompt()` returns fallback for unknown skills.
- [ ] All prompts enforce "Do not guess/hallucinate" rule where applicable.
- [ ] No prompts are hardcoded inside services or nodes.
- [ ] All prompts that expect JSON output clearly specify the schema.
- [ ] Root `index.ts` re-exports everything cleanly.
- [ ] `npm run build` passes with zero errors.

---

## Summary

```text
Phase 1   →  Create folders                    (1 min)
Phase 2   →  intent-detection.prompt.ts        (10 min)
Phase 3   →  clarification-resolution.prompt   (8 min)
Phase 4   →  reasoning.prompt.ts (core brain)  (15 min)
Phase 5   →  response-strategy.prompt.ts       (10 min)
Phase 6   →  response-packaging.prompt.ts      (5 min)
Phase 7   →  6 skill prompts                   (20 min)
Phase 8   →  skills/index.ts (skill map)       (5 min)
Phase 9   →  prompts/index.ts (re-exports)     (3 min)
Phase 10  →  Build & smoke test                (5 min)
───────────────────────────────────────────────────────
Total                                          ~82 min
```

> **Next module:** `ai-agent/` (Module 05) — the LangGraph graph builder that consumes these prompts
