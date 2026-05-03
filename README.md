# AI Sales/Consulting Chatbot Platform

This repository contains the full project workspace for an AI-powered sales and consulting chatbot platform.

The goal is to build a chatbot that works more like a real consultant than a simple FAQ bot. The system should understand user intent, choose the right consulting skill, retrieve trusted knowledge, reason through the user problem, ask follow-up questions when information is missing, and respond in natural message chunks.

The first target use case is academic admissions consulting. The architecture is designed so the product can later expand to e-commerce sales, customer support, Facebook Messenger, Zalo OA, CRM handoff, and analytics.

## Repository Contents

```text
Chatbot_ver2/
  Backend/                NestJS backend source code
  ai-chatbot-project/     Product, AI, system design, data, and execution docs
  .agent/                 AI agent rules, plans, commands, and execution details
  AGENT.md                Root guidance for AI coding assistants
  README.md               Root project overview
```

## Current Status

The project is in the foundation/MVP planning and backend scaffolding stage.

Current backend foundation:

- NestJS application with TypeScript
- Global API prefix: `/api/v1`
- Global validation pipe
- Global HTTP exception filter
- Global logging interceptor placeholder
- Config module setup with environment validation direction
- Jest test setup

Current documentation foundation:

- Product requirements
- MVP scope
- AI reasoning flow
- Intent and skill design
- Retrieval/RAG design
- System architecture
- API flow
- Deployment plan
- Execution backlog and sprint plan
- Detailed agent execution plans

## Product Vision

Traditional chatbot flow:

```text
User question -> FAQ answer
```

Target product flow:

```text
User question
-> input guard
-> intent detection
-> customer context analysis
-> skill selection
-> retrieval planning
-> knowledge retrieval
-> adaptive reasoning
-> response strategy
-> natural packaged messages
```

The key product idea is to transform a basic FAQ bot into a proactive AI consulting agent.

## Main Features Planned

- Multi-channel chat support
- Website/API chat entry point for MVP
- Facebook Messenger integration in a later phase
- Zalo OA integration in a later phase
- Intent detection
- Skill routing
- FAQ answering
- Academic admissions consulting
- Tuition and major information support
- RAG-based knowledge retrieval
- Adaptive shallow/deep reasoning
- Clarification questions when user context is missing
- Human-like response packaging
- Human handoff in later phases
- CRM and analytics in later phases

## Tech Stack

Backend:

- Node.js
- TypeScript
- NestJS
- Joi
- Jest
- Supertest

AI and data direction:

- OpenAI for LLM reasoning
- LangGraph for AI workflow orchestration
- JSON/Markdown files for MVP knowledge base
- Vector database in a later phase
- PostgreSQL optional for logging and analytics

## Folder Guide

### `Backend/`

Contains the runnable backend application.

Important files:

```text
Backend/src/main.ts                  NestJS bootstrap
Backend/src/app.module.ts            Root application module
Backend/src/common/constants/        Shared constants
Backend/src/common/filters/          Global error handling
Backend/src/common/interceptors/     Logging interceptor
Backend/src/config/                  Environment configuration module
Backend/package.json                 Backend dependencies and scripts
Backend/README.md                    Backend-specific setup guide
```

### `ai-chatbot-project/`

Contains the main project documentation and product planning.

Important sections:

```text
ai-chatbot-project/01_product/       PRD, problem statement, MVP scope
ai-chatbot-project/02_ai_core/       Reasoning flow, intent, skill, retrieval, response design
ai-chatbot-project/03_system_design/ Architecture, API flow, LangGraph flow, deployment
ai-chatbot-project/04_integrations/  Facebook, Zalo, CRM future plans
ai-chatbot-project/05_data/          FAQ, vector data, conversation schema
ai-chatbot-project/06_diagrams/      Use case, sequence, ERD docs
ai-chatbot-project/07_execution/     Backlog, sprint plan, task breakdown
```

### `.agent/`

Contains AI-agent working documents for planning and implementation.

Important sections:

```text
.agent/plans/          High-level implementation plans by module
.agent/plans/detail/   Detailed execution plans
.agent/rules/          Project rules and conventions for AI coding assistants
.agent/commands/       Command references
.agent/agents/         Agent role definitions
.agent/skills/         Repeatable execution workflows
```

These files are useful when working with an AI coding assistant because they preserve project context, module plans, and implementation direction.

## Getting Started

Clone the repository and install backend dependencies:

```bash
cd Backend
npm install
```

Create your local environment file:

```bash
copy .evn.example .env
```

Note: the current example file is named `.evn.example`. It should eventually be renamed to `.env.example`.

Example environment values:

```env
NODE_ENV=development
PORT=3000
OPENAI_API_KEY=sk-your-key-here
```

Do not commit real API keys or secrets.

## Run Backend

From `Backend/`:

```bash
npm run start:dev
```

Default local URL:

```text
http://localhost:3000
```

Current API prefix:

```text
/api/v1
```

Current basic route:

```text
GET http://localhost:3000/api/v1
```

## Backend Scripts

From `Backend/`:

```bash
npm run build        # Build the backend
npm run start        # Start backend
npm run start:dev    # Start backend in watch mode
npm run start:prod   # Run compiled build
npm run format       # Format source and test files
npm run lint         # Run ESLint with auto-fix
npm run test         # Run unit tests
npm run test:e2e     # Run end-to-end tests
npm run test:cov     # Run test coverage
```

## MVP Roadmap

Phase 1: Core AI reasoning

- Build chat API endpoint
- Add input validation
- Add intent detection
- Add skill selection
- Add retrieval planning
- Add knowledge base retrieval
- Add adaptive reasoning
- Add response packaging
- Add basic logging

Phase 2: Channel integrations

- Facebook Messenger webhook
- Zalo OA webhook
- Channel-specific response formatting

Phase 3: CRM and human handoff

- Customer state tracking
- Bot on/off switch
- Human handoff workflow

Phase 4: Analytics and dashboard

- Conversation logs
- AI quality metrics
- Response latency metrics
- Admin dashboard

## Development Workflow

Recommended team workflow:

1. Read the root README first.
2. Read `ai-chatbot-project/01_product/mvp_scope.md` to understand the MVP boundary.
3. Read `ai-chatbot-project/03_system_design/architecture.md` before changing architecture.
4. Use `.agent/plans/` and `.agent/plans/detail/` when implementing modules.
5. Work inside `Backend/` for backend source code.
6. Run format, lint, and tests before pushing code.

Before pushing backend code:

```bash
cd Backend
npm run format
npm run lint
npm run test
```

## Git Notes

If you want to push the full workspace, initialize Git from the root folder `Chatbot_ver2/` so the team receives the backend, product documents, and agent plans together.

From the root folder:

```bash
git init
git add README.md AGENT.md Backend ai-chatbot-project .agent
git commit -m "Add chatbot project workspace"
git push
```

If you already have a remote GitHub repository, add it before pushing:

```bash
git remote add origin <your-github-repo-url>
git branch -M main
git push -u origin main
```

Make sure `.env`, `node_modules/`, build output, and local machine files are not committed.

## Key Documents

- Product requirements: `ai-chatbot-project/01_product/prd.md`
- MVP scope: `ai-chatbot-project/01_product/mvp_scope.md`
- Global plan: `ai-chatbot-project/global_plan.md`
- Architecture: `ai-chatbot-project/03_system_design/architecture.md`
- LangGraph flow: `ai-chatbot-project/03_system_design/langgraph_flow.md`
- API flow: `ai-chatbot-project/03_system_design/api_flow.md`
- Execution backlog: `ai-chatbot-project/07_execution/backlog.md`
- Agent execution plans: `.agent/plans/`

## Important Notes

- The backend is not the AI agent itself. The backend is the API/application layer.
- The planned LangGraph layer is responsible for multi-step AI reasoning.
- MVP knowledge should be grounded in trusted JSON/Markdown content.
- If the knowledge base does not contain enough information, the chatbot should ask a clarification question instead of guessing.
- Future integrations should be added only after the AI reasoning core is stable.
