# AI Sales/Consulting Chatbot Backend

Backend service for an AI chatbot platform that aims to move beyond a simple FAQ bot. The system is designed to understand user intent, select the right consulting skill, retrieve relevant knowledge, reason with an LLM, and return natural multi-message responses.

The first product focus is academic admissions consulting. The architecture is planned so the same backend can later support e-commerce sales, customer support, Facebook Messenger, Zalo OA, CRM handoff, and analytics.

## Project Status

This repository currently contains the NestJS backend foundation.

Implemented foundation:

- NestJS application setup with TypeScript
- Global API prefix: `/api/v1`
- Global validation pipe
- Global HTTP exception filter
- Global logging interceptor placeholder
- Environment configuration module setup
- Unit and e2e test setup from NestJS

Planned next modules:

- Chat API endpoint
- Intent detection
- Skill selection
- Knowledge retrieval / RAG
- OpenAI integration
- LangGraph orchestration
- Response packaging
- Basic logging

## Tech Stack

- Runtime: Node.js
- Language: TypeScript
- Framework: NestJS
- Config: `@nestjs/config`
- Validation schema: Joi
- Testing: Jest, Supertest
- Future AI layer: LangGraph + OpenAI
- Future data layer: JSON / Markdown KB, optional PostgreSQL for logs

## Repository Structure

```text
Backend/
  src/
    common/
      constants/       Shared constants such as API prefix and input limits
      filters/         Global HTTP exception filter
      interceptors/    Global request/response logging interceptor
      types/           Shared TypeScript types
    config/            Application configuration module/service
    app.controller.ts  Default root controller
    app.module.ts      Root NestJS module
    app.service.ts     Default app service
    main.ts            Application bootstrap
  test/                E2E tests
  package.json         Scripts and dependencies
  nest-cli.json        Nest CLI configuration
```

Planning documents are stored outside this backend folder in `../ai-chatbot-project/`.

## Prerequisites

Install these before running the project:

- Node.js 20 or newer is recommended
- npm

Check your versions:

```bash
node -v
npm -v
```

## Getting Started

From the backend folder:

```bash
cd Backend
npm install
```

Create a local environment file:

```bash
copy .evn.example .env
```

Note: the example file is currently named `.evn.example`. If the team standardizes it later, rename it to `.env.example`.

Update `.env` with local values:

```env
NODE_ENV=development
PORT=3000
OPENAI_API_KEY=sk-your-key-here
```

Never commit real secrets or API keys.

## Running the App

Development mode:

```bash
npm run start:dev
```

Normal start:

```bash
npm run start
```

Production build and start:

```bash
npm run build
npm run start:prod
```

By default, the app runs on:

```text
http://localhost:3000
```

All API routes are prefixed with:

```text
/api/v1
```

Current health/basic test route:

```text
GET http://localhost:3000/api/v1
```

## Available Scripts

```bash
npm run build        # Compile TypeScript into dist/
npm run format       # Format source and test files with Prettier
npm run start        # Start the NestJS app
npm run start:dev    # Start with watch mode
npm run start:debug  # Start with debug mode and watch mode
npm run start:prod   # Run compiled production build
npm run lint         # Run ESLint with auto-fix
npm run test         # Run unit tests
npm run test:watch   # Run unit tests in watch mode
npm run test:cov     # Run test coverage
npm run test:e2e     # Run end-to-end tests
```

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `NODE_ENV` | Yes | Runtime environment, usually `development`, `test`, or `production`. |
| `PORT` | Yes | HTTP server port. Current bootstrap defaults to `3000`. |
| `OPENAI_API_KEY` | Future | Required when OpenAI integration is implemented. |

Future database variables are listed in the example env file and can be enabled when PostgreSQL logging is added.

## API Conventions

Use the global API prefix for all backend routes:

```text
/api/v1
```

Expected response direction:

- Successful responses should follow a consistent API response shape.
- Error responses should be handled through the global HTTP exception filter.
- Request validation should use DTO classes so the global validation pipe can whitelist valid fields and reject unknown fields.

## Development Guidelines

Before opening a pull request:

```bash
npm run format
npm run lint
npm run test
```

Recommended workflow:

1. Create a feature branch from the main development branch.
2. Keep commits focused on one feature or fix.
3. Add or update tests when behavior changes.
4. Do not commit `.env`, secrets, generated logs, or local machine files.
5. Update this README when setup steps, scripts, routes, or architecture change.

## Product Roadmap Summary

Phase 1 focuses on the AI reasoning core:

- Input handling
- Intent detection
- Skill selection
- Knowledge retrieval
- Adaptive reasoning
- Response packaging
- Basic logging

Later phases:

- Facebook Messenger and Zalo OA integrations
- CRM integration and human handoff
- Analytics dashboard
- Multi-tenant and production operations improvements

## Useful References

- Product requirements: `../ai-chatbot-project/01_product/prd.md`
- MVP scope: `../ai-chatbot-project/01_product/mvp_scope.md`
- Architecture: `../ai-chatbot-project/03_system_design/architecture.md`
- API flow: `../ai-chatbot-project/03_system_design/api_flow.md`
