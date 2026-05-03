# Global Plan: AI Consulting Chatbot

## Executive Summary
Build an AI-powered consulting chatbot that transforms the standard FAQ bot into a proactive **AI Consulting Agent**. The MVP focuses exclusively on the **AI Reasoning & Consulting Skill System** — the core competitive moat — before adding channel integrations or CRM.

**Tech Stack:** TypeScript, NestJS, LangGraph, OpenAI, JSON/Markdown KB, PostgreSQL (logging)

---

## Phase Overview

```text
Phase 1: Core AI Reasoning (MVP)          ← Current Focus
Phase 2: Channel Integration (Facebook, Zalo)
Phase 3: CRM & Human Handoff
Phase 4: Analytics & Dashboard
```

---

## Phase 1: Core AI Reasoning (MVP)

**Goal:** End-to-end operational AI reasoning core.
**Timeline:** ~3 weeks
**Deliverable:** A working API (`POST /api/v1/ai/chat`) that takes a user message and returns intelligent, multi-message responses.

### Sprint 1: Foundation & Scaffolding (Week 1)

| # | Task | Priority | Status |
| :---: | :--- | :---: | :---: |
| 1.1 | Initialize NestJS project with TypeScript strict mode | High | ⬜ |
| 1.2 | Set up ESLint + Prettier (2 spaces, single quotes, semicolons) | High | ⬜ |
| 1.3 | Create `config/` module (env vars: `OPENAI_API_KEY`, `NODE_ENV`, `PORT`) | High | ⬜ |
| 1.4 | Create `common/` module (error filter, logging interceptor, shared types) | High | ⬜ |
| 1.5 | Implement `health/` module (`GET /api/v1/health`) | Medium | ⬜ |
| 1.6 | Create `ai-chat/` module with controller, service, and DTOs | High | ⬜ |
| 1.7 | Set up `ChatRequestDto` with `class-validator` decorators | High | ⬜ |
| 1.8 | Set up `ChatResponseDto` output shape | High | ⬜ |
| 1.9 | Create `ai-agent/` module scaffold (service, state.ts, graph.ts) | High | ⬜ |
| 1.10 | Create empty node files in `ai-agent/nodes/` (all 8 nodes) | Medium | ⬜ |
| 1.11 | Create `prompts/` folder structure with placeholder prompt files | Medium | ⬜ |
| 1.12 | Create `knowledge-base/` module with static data files | Medium | ⬜ |
| 1.13 | Populate initial KB: `faq.json`, `admissions.md`, `tuition.md`, `majors.md` | Medium | ⬜ |
| 1.14 | Create `logging/` module (console-based for MVP) | Low | ⬜ |
| 1.15 | Docker + docker-compose setup (app + PostgreSQL) | Low | ⬜ |
| 1.16 | Verify end-to-end: HTTP request → empty agent → stub response | High | ⬜ |

**Sprint 1 Exit Criteria:**
- `POST /api/v1/ai/chat` accepts a request and returns a stub response.
- `GET /api/v1/health` returns `{ "status": "ok" }`.
- All modules compile with zero TypeScript errors.
- Folder structure matches `structure.md`.

---

### Sprint 2: AI Agent Core Nodes (Week 2)

| # | Task | Priority | Status |
| :---: | :--- | :---: | :---: |
| 2.1 | Implement `input_guard_node` & `conversation_resume_node` | High | ⬜ |
| 2.2 | Implement `clarification_resolution_node` (LLM evaluate user reply) | High | ⬜ |
| 2.3 | Implement `clarification_retry_strategy_node` & `continue_previous_task_node` | High | ⬜ |
| 2.4 | Implement `intent_detection_node` & `intent_clarification_strategy_node` | High | ⬜ |
| 2.5 | Implement `skill_selection_node` (intent → skill mapping) | High | ⬜ |
| 2.6 | Implement `retrieval_planning_node` & `knowledge-base.service.ts` | High | ⬜ |
| 2.7 | Implement `knowledge_retrieval_node` (call KB service) | High | ⬜ |
| 2.8 | Implement `adaptive_reasoning_node` (analyze info gaps) | High | ⬜ |
| 2.9 | Implement `missing_info_strategy_node` & `response_strategy_node` | High | ⬜ |
| 2.10 | Implement `response_packaging_node` (split into 2-3 messages) | Medium | ⬜ |
| 2.11 | Wire all 14 nodes into `graph.ts` with LangGraph normal edges | High | ⬜ |
| 2.12 | Wire conditional edges (Has Pending, Resolved, Clarification Type) | High | ⬜ |
| 2.13 | End-to-end test: Fresh Request -> Response | High | ⬜ |
| 2.14 | End-to-end test: Clarification Loop -> Resume -> Final Answer | High | ⬜ |

**Sprint 2 Exit Criteria:**
- Full 14-node graph executes properly.
- Bot can pause, ask a question, and successfully resume execution when the user answers.

---

### Sprint 3: Polish, Prompts & Testing (Week 3)

| # | Task | Priority | Status |
| :---: | :--- | :---: | :---: |
| 3.1 | Write skill-specific prompts (`faq.prompt.ts`, `career-consulting.prompt.ts`, etc.) | High | ⬜ |
| 3.2 | Tune intent detection prompt for accuracy (test with 20+ sample inputs) | High | ⬜ |
| 3.3 | Tune reasoning prompt (verify shallow vs. deep routing correctness) | High | ⬜ |
| 3.4 | Tune response packaging (ensure natural tone, proper message splitting) | Medium | ⬜ |
| 3.5 | Expand KB data: add more FAQs, major details, scholarship info | Medium | ⬜ |
| 3.6 | Add conversation history support (pass history in `AgentState`) | Medium | ⬜ |
| 3.7 | Implement basic logging: log intent, skill, latency per request | Medium | ⬜ |
| 3.8 | Write unit tests for each node (mock LLM responses) | Medium | ⬜ |
| 3.9 | Write E2E test: full API request → response validation | Medium | ⬜ |
| 3.10 | Error handling: graceful failures for LLM timeouts, empty retrieval | High | ⬜ |
| 3.11 | Performance check: measure average latency per request | Low | ⬜ |
| 3.12 | Document API with sample curl commands in README | Low | ⬜ |
| 3.13 | Final review: ensure no `any` types, no hard-coded prompts in services | Medium | ⬜ |

**Sprint 3 Exit Criteria:**
- AI provides grounded, accurate answers (no hallucination on KB topics).
- Proactively asks follow-up questions when context is missing.
- Responses sound natural and conversational (not robotic).
- Average response latency < 3 seconds.
- All tests pass.

---

## Phase 2: Channel Integration

**Goal:** Connect the AI core to real messaging platforms.
**Timeline:** ~2 weeks (after Phase 1 is stable)

| # | Task | Priority | Status |
| :---: | :--- | :---: | :---: |
| 2.1 | Set up Facebook Page + App for Messenger integration | High | ⬜ |
| 2.2 | Implement `POST /api/v1/webhooks/facebook` (verify + receive) | High | ⬜ |
| 2.3 | Parse Facebook message events → call `/api/v1/ai/chat` | High | ⬜ |
| 2.4 | Send packaged `messages[]` back via Facebook Send API | High | ⬜ |
| 2.5 | Add simulated typing delay between messages | Medium | ⬜ |
| 2.6 | Set up Zalo OA for webhook integration | High | ⬜ |
| 2.7 | Implement `POST /api/v1/webhooks/zalo` | High | ⬜ |
| 2.8 | Parse Zalo events → call AI → send responses back | High | ⬜ |
| 2.9 | Channel-specific message formatting (image, quick replies) | Low | ⬜ |
| 2.10 | Test end-to-end on real Facebook/Zalo accounts | High | ⬜ |

---

## Phase 3: CRM & Human Handoff

**Goal:** Enable bot/human switching and customer state tracking.
**Timeline:** ~2 weeks

| # | Task | Priority | Status |
| :---: | :--- | :---: | :---: |
| 3.1 | Design CRM data model (customer profiles, bot status) | High | ⬜ |
| 3.2 | Implement `GET /api/v1/crm/customers/:id/bot-status` | High | ⬜ |
| 3.3 | Bot On/Off switch per customer (seller controls) | High | ⬜ |
| 3.4 | Implement `POST /api/v1/conversations/:id/handoff` | High | ⬜ |
| 3.5 | Notify seller when handoff is triggered | Medium | ⬜ |
| 3.6 | Pass CRM customer context into `AgentState` for personalized responses | Medium | ⬜ |
| 3.7 | Auto-resume bot after seller finishes conversation | Low | ⬜ |

---

## Phase 4: Analytics & Dashboard

**Goal:** Visibility into chatbot performance and business metrics.
**Timeline:** ~2-3 weeks

| # | Task | Priority | Status |
| :---: | :--- | :---: | :---: |
| 4.1 | Store all conversation logs in PostgreSQL | High | ⬜ |
| 4.2 | Track AI metrics: intent accuracy, retrieval precision, latency | High | ⬜ |
| 4.3 | Track business metrics: response speed, engagement time | Medium | ⬜ |
| 4.4 | Build admin dashboard (conversation viewer) | Medium | ⬜ |
| 4.5 | Hallucination detection & flagging system | Medium | ⬜ |
| 4.6 | Export conversation data for prompt tuning | Low | ⬜ |

---

## Risk & Mitigation

| Risk | Impact | Mitigation |
| :--- | :---: | :--- |
| LLM hallucination on topics not in KB | High | Enforce grounding: if no relevant KB content found, ask for clarification instead of guessing. |
| High latency (multiple LLM calls per request) | Medium | Combine reasoning + strategy into a single LLM call. Use `gpt-4o-mini` for intent detection. |
| Prompt injection attacks | Medium | Basic Input Guard in MVP. Advanced guardrails in Phase 4. |
| Knowledge Base data quality | High | Manually curate and review all KB entries before launch. |
| OpenAI API rate limits / downtime | Medium | Implement retry logic with exponential backoff. Add fallback responses. |

---

## Success Criteria (Overall)

### MVP (Phase 1) ✅
- [ ] AI provides accurate, grounded answers from KB
- [ ] Proactively asks follow-up questions when info is missing
- [ ] Responses are natural and multi-message (not bot-like)
- [ ] Hallucination rate ≈ 0% on supported topics
- [ ] Average response latency < 3 seconds

### Production (Phase 2-4)
- [ ] Works on Facebook Messenger and Zalo OA
- [ ] Sellers can toggle bot on/off per customer
- [ ] Dashboard shows conversation logs and AI metrics
- [ ] Measurable reduction in seller workload
