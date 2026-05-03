# Detailed Execution Plan: `logging/` Module

## Pre-requisites
- [ ] `common/` module is complete (types for ReasoningLevel, etc.)
- [ ] `npm run build` passes

---

## Phase 1: Create Folder Structure
**Estimated Time:** 1 minute

```text
src/
└── logging/
    ├── logging.module.ts
    ├── logging.service.ts
    └── logging.types.ts
```

---

## Phase 2: Logging Types (`logging.types.ts`)
**Estimated Time:** 5 minutes
**Why first:** The service methods use these interfaces as parameters.

### Task 2.1: Create `src/logging/logging.types.ts`

```typescript
/**
 * Data logged after every chat interaction.
 * Consumed by AiChatService after the agent completes.
 */
export interface InteractionLog {
  sessionId: string;
  userMessage: string;
  intent: string;
  intentConfidence: number;
  skill: string;
  reasoningLevel: string;
  responseType: string;
  latencyMs: number;
}

/**
 * AI-specific performance metrics.
 * Used for prompt tuning and cost tracking.
 */
export interface AiMetricsLog {
  sessionId: string;
  nodeId: string;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  latencyMs: number;
  success: boolean;
  error?: string;
}

/**
 * Knowledge retrieval metrics.
 * Used to evaluate RAG quality.
 */
export interface RetrievalLog {
  sessionId: string;
  query: string;
  skill: string;
  sourcesFound: number;
  sources: string[];
  latencyMs: number;
}
```

### Task 2.2: Verify
- [ ] `npm run build` passes.
- [ ] No `any` types.

---

## Phase 3: Logging Service (`logging.service.ts`)
**Estimated Time:** 15 minutes

### Task 3.1: Create `src/logging/logging.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InteractionLog, AiMetricsLog, RetrievalLog } from './logging.types';

/**
 * Centralized logging service for AI pipeline observability.
 *
 * MVP: Outputs structured JSON to console (easily parseable by log aggregators).
 * Future: Write to PostgreSQL, send to monitoring dashboard.
 *
 * All methods are fire-and-forget — they never throw and never block
 * the main request flow.
 */
@Injectable()
export class LoggingService {
  private readonly logger = new Logger('AILogger');

  /**
   * Log a complete chat interaction after the agent finishes.
   * Called by AiChatService at the end of processMessage().
   */
  logInteraction(data: InteractionLog): void {
    try {
      this.logger.log(
        JSON.stringify({
          type: 'interaction',
          timestamp: new Date().toISOString(),
          ...data,
        }),
      );
    } catch {
      // Never let logging crash the app
    }
  }

  /**
   * Log metrics from an individual LLM call within a node.
   * Called by nodes that invoke OpenAI (intent-detection, reasoning, etc.)
   */
  logAiMetrics(data: AiMetricsLog): void {
    try {
      this.logger.log(
        JSON.stringify({
          type: 'ai_metrics',
          timestamp: new Date().toISOString(),
          ...data,
        }),
      );
    } catch {
      // Never let logging crash the app
    }
  }

  /**
   * Log knowledge retrieval results for RAG quality tracking.
   * Called by the knowledge-retrieval node.
   */
  logRetrieval(data: RetrievalLog): void {
    try {
      this.logger.log(
        JSON.stringify({
          type: 'retrieval',
          timestamp: new Date().toISOString(),
          ...data,
        }),
      );
    } catch {
      // Never let logging crash the app
    }
  }

  /**
   * Generic structured log for pipeline steps.
   * Use for debugging during development.
   */
  logStep(sessionId: string, step: string, detail: string): void {
    try {
      this.logger.log(
        JSON.stringify({
          type: 'pipeline_step',
          timestamp: new Date().toISOString(),
          sessionId,
          step,
          detail,
        }),
      );
    } catch {
      // Never let logging crash the app
    }
  }
}
```

### Task 3.2: Verify
- [ ] `npm run build` passes.
- [ ] All methods are `void` (fire-and-forget, non-blocking).
- [ ] All methods wrapped in try/catch (logging must never crash the app).

---

## Phase 4: Logging Module (`logging.module.ts`)
**Estimated Time:** 3 minutes

### Task 4.1: Create `src/logging/logging.module.ts`

```typescript
import { Global, Module } from '@nestjs/common';
import { LoggingService } from './logging.service';

/**
 * Global logging module.
 * @Global ensures any module can inject LoggingService
 * without explicitly importing LoggingModule.
 */
@Global()
@Module({
  providers: [LoggingService],
  exports: [LoggingService],
})
export class LoggingModule {}
```

### Task 4.2: Verify
- [ ] `npm run build` passes.
- [ ] Module is `@Global()` so it can be injected everywhere.

---

## Phase 5: Register in `app.module.ts`
**Estimated Time:** 2 minutes

### Task 5.1: Add `LoggingModule` to imports

```typescript
import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { HealthModule } from './health/health.module';
import { AiChatModule } from './ai-chat/ai-chat.module';
import { KnowledgeBaseModule } from './knowledge-base/knowledge-base.module';
import { LoggingModule } from './logging/logging.module';

@Module({
  imports: [
    AppConfigModule,
    LoggingModule,
    HealthModule,
    AiChatModule,
    KnowledgeBaseModule,
  ],
})
export class AppModule {}
```

---

## Phase 6: Wire into `AiChatService`
**Estimated Time:** 5 minutes

### Task 6.1: Inject `LoggingService` in `ai-chat.service.ts`

Add logging after the stub response (or real agent call):

```typescript
constructor(
  private readonly loggingService: LoggingService,
) {}

async processMessage(request: ChatRequestDto): Promise<ChatResponseDto> {
  const startTime = Date.now();
  // ... existing logic ...
  const latency = Date.now() - startTime;

  // Fire-and-forget interaction log
  this.loggingService.logInteraction({
    sessionId: request.session_id,
    userMessage: request.message,
    intent: response.intent.name,
    intentConfidence: response.intent.confidence,
    skill: response.skill.name,
    reasoningLevel: response.reasoning.level,
    responseType: 'final_answer',
    latencyMs: latency,
  });

  return response;
}
```

---

## Phase 7: Smoke Test
**Estimated Time:** 5 minutes

### Task 7.1: Send a chat request and check logs

```bash
curl -X POST http://localhost:3000/api/v1/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"session_id":"log_test","channel":"web","message":"Test logging"}'
```

**Expected Console Output (structured JSON):**
```text
[AILogger] {"type":"interaction","timestamp":"...","sessionId":"log_test","userMessage":"Test logging","intent":"unknown","intentConfidence":0,"skill":"fallback_skill","reasoningLevel":"shallow","responseType":"final_answer","latencyMs":3}
```

### Task 7.2: Verify all acceptance criteria
- [ ] `LoggingService` is injectable in any module (thanks to `@Global()`).
- [ ] Console shows structured JSON logs after each request.
- [ ] Logging never blocks the main response (fire-and-forget).
- [ ] Logging errors are silently caught (never crashes the app).
- [ ] `npm run build` passes with zero errors.

---

## Summary

```text
Phase 1  →  Create folders          (1 min)
Phase 2  →  logging.types.ts        (5 min)
Phase 3  →  logging.service.ts      (15 min)
Phase 4  →  logging.module.ts       (3 min)
Phase 5  →  Register in app.module  (2 min)
Phase 6  →  Wire into AiChatService (5 min)
Phase 7  →  Smoke test              (5 min)
────────────────────────────────────────────
Total                               ~36 min
```

> **Next module:** `prompts/` (Module 06)
