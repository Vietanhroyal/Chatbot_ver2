# Project Structure: AI Consulting Chatbot

## Documentation Structure (`ai-chatbot-project/`)

```text
ai-chatbot-project/
│
├── structure.md                          ← You are here
├── global_plan.md                        ← Master execution plan
│
├── 01_product/
│   ├── prd.md                            ← Product Requirements Document
│   ├── problem_statement.md              ← Core problem definition
│   └── mvp_scope.md                      ← MVP feature boundary
│
├── 02_ai_core/
│   ├── reasoning_flow.md                 ← 9-step MVP reasoning pipeline
│   ├── intent_design.md                  ← Input Guard + Intent classification
│   ├── skill_design.md                   ← Skill routing definitions
│   ├── retrieval_design.md               ← RAG planning & knowledge retrieval
│   └── response_strategy.md              ← Adaptive reasoning + response packaging
│
├── 03_system_design/
│   ├── architecture.md                   ← System architecture overview
│   ├── langgraph_flow.md                 ← LangGraph state & node design
│   ├── api_flow.md                       ← API endpoints & DTO contracts
│   └── deployment.md                     ← Deployment & infrastructure plan
│
├── 04_integrations/
│   ├── facebook_webhook.md               ← Facebook Messenger (Phase 2)
│   ├── zalo_webhook.md                   ← Zalo OA (Phase 2)
│   └── crm_future_plan.md               ← CRM integration (Phase 3)
│
├── 05_data/
│   ├── faq_data.md                       ← FAQ content structure
│   ├── vector_data.md                    ← Embedding & vector DB strategy
│   └── conversation_schema.md            ← Conversation log schema
│
├── 06_diagrams/
│   ├── usecase.md                        ← Use case diagrams
│   ├── sequence.md                       ← Sequence diagrams
│   └── erd.md                            ← Entity Relationship Diagram
│
└── 07_execution/
    ├── task_breakdown.md                 ← Detailed task list
    ├── sprint_plan.md                    ← Sprint timeline
    └── backlog.md                        ← Feature backlog
```

---

## Source Code Structure (`src/`)

The actual NestJS + LangGraph codebase follows the architecture defined in [architecture.md](./03_system_design/architecture.md) and [langgraph_flow.md](./03_system_design/langgraph_flow.md).

```text
src/
│
├── main.ts                               ← NestJS bootstrap
├── app.module.ts                         ← Root module
│
├── common/                               ← Shared utilities & cross-cutting concerns
│   ├── filters/
│   │   └── http-exception.filter.ts      ← Global error handler
│   ├── interceptors/
│   │   └── logging.interceptor.ts        ← Request/response logging
│   ├── types/
│   │   └── index.ts                      ← Shared TypeScript types
│   └── constants/
│       └── index.ts                      ← App-wide constants
│
├── config/                               ← Configuration module
│   ├── config.module.ts
│   └── config.service.ts                 ← Env vars: OpenAI key, DB, etc.
│
├── health/                               ← GET /api/v1/health
│   ├── health.module.ts
│   ├── health.controller.ts
│   └── health.service.ts
│
├── ai-chat/                              ← POST /api/v1/ai/chat (API layer)
│   ├── ai-chat.module.ts
│   ├── ai-chat.controller.ts             ← Receives HTTP, returns JSON
│   ├── ai-chat.service.ts                ← Orchestrates: validate → invoke agent → format
│   └── dto/
│       ├── chat-request.dto.ts           ← Input validation (class-validator)
│       └── chat-response.dto.ts          ← Output shape
│
├── ai-agent/                             ← LangGraph AI Reasoning Engine
│   ├── ai-agent.module.ts
│   ├── ai-agent.service.ts               ← Entry point: graph.invoke(state)
│   ├── state.ts                          ← AgentState interface
│   ├── graph.ts                          ← LangGraph graph builder & edges
│   └── nodes/                            ← Individual graph nodes (14 total)
│       ├── input-guard.node.ts
│       ├── conversation-resume.node.ts
│       ├── clarification-resolution.node.ts
│       ├── clarification-retry-strategy.node.ts
│       ├── continue-previous-task.node.ts
│       ├── intent-detection.node.ts
│       ├── intent-clarification-strategy.node.ts
│       ├── skill-selection.node.ts
│       ├── retrieval-planning.node.ts
│       ├── knowledge-retrieval.node.ts
│       ├── adaptive-reasoning.node.ts
│       ├── missing-info-strategy.node.ts
│       ├── response-strategy.node.ts
│       └── response-packaging.node.ts
│
├── prompts/                              ← All LLM prompt templates
│   ├── intent-detection.prompt.ts        ← Prompt for intent classification
│   ├── reasoning.prompt.ts               ← Prompt for adaptive reasoning
│   ├── response-strategy.prompt.ts       ← Prompt for strategy selection
│   ├── response-packaging.prompt.ts      ← Prompt for message splitting
│   └── skills/                           ← Skill-specific prompt templates
│       ├── faq.prompt.ts
│       ├── tuition.prompt.ts
│       ├── major-info.prompt.ts
│       ├── career-consulting.prompt.ts
│       ├── persuasion.prompt.ts
│       └── human-handoff.prompt.ts
│
├── knowledge-base/                       ← Knowledge Base service & data
│   ├── knowledge-base.module.ts
│   ├── knowledge-base.service.ts         ← Search/retrieve from KB
│   └── data/                             ← Static MVP knowledge files
│       ├── faq.json                      ← Structured FAQ entries
│       ├── admissions.md                 ← Admission policies
│       ├── tuition.md                    ← Tuition fee details
│       ├── majors.md                     ← Major/program descriptions
│       └── scholarships.md              ← Scholarship information
│
└── logging/                              ← Internal logging service
    ├── logging.module.ts
    └── logging.service.ts                ← Log intent, skill, latency, etc.
```

---

## Root Project Files

```text
Chatbot_ver2/
│
├── ai-chatbot-project/                   ← Documentation (this folder)
├── src/                                  ← Source code (NestJS + LangGraph)
├── test/                                 ← E2E and unit tests
│
├── .env                                  ← Environment variables (gitignored)
├── .env.example                          ← Template for env vars
├── .eslintrc.js                          ← ESLint configuration
├── .prettierrc                           ← Prettier configuration
├── .gitignore
├── nest-cli.json                         ← NestJS CLI config
├── tsconfig.json                         ← TypeScript configuration
├── tsconfig.build.json                   ← Build-specific TS config
├── package.json
├── package-lock.json
├── Dockerfile                            ← Container build
├── docker-compose.yml                    ← Local dev with PostgreSQL
├── README.md                             ← Project README
└── AGENT.md                              ← AI coding assistant rules
```

---

## Key Design Decisions

| Decision | Rationale |
| :--- | :--- |
| **Prompts in `prompts/` folder** | Follows coding rules: no hard-coded long prompts in services. Load only the required skill prompt. |
| **Nodes in `ai-agent/nodes/`** | Each graph node is a separate file for testability and clarity. Maps 1:1 to the 9-step reasoning flow. |
| **DTOs in `ai-chat/dto/`** | Strict input/output contracts using `class-validator` decorators. |
| **`common/` for shared logic** | Error filters, interceptors, and types are reusable across modules. |
| **`config/` module** | Centralized environment configuration (API keys, DB URLs, feature flags). |
| **Static KB in `knowledge-base/data/`** | MVP uses JSON/Markdown files. Vector DB is a future upgrade path. |
