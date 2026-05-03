# Detailed Execution Plan: `common/` Module

## Pre-requisites
Before starting, ensure the NestJS project is initialized:
- [ ] `npx -y @nestjs/cli new ./ --strict --skip-git --package-manager npm` (if not done)
- [ ] Project compiles with `npm run build`
- [ ] `npm run start:dev` starts without errors

---

## Phase 1: Create Folder Structure
**Estimated Time:** 2 minutes

### Task 1.1: Create directories
```text
src/
└── common/
    ├── filters/
    ├── interceptors/
    ├── types/
    └── constants/
```

**Verification:** All 4 subdirectories exist under `src/common/`.

---

## Phase 2: Shared Types (`types/index.ts`)
**Estimated Time:** 15 minutes
**Why first:** Other files in this module import these types.

### Task 2.1: Create `src/common/types/index.ts`

Write the following types in this exact order:

```typescript
// ─── API Response Shapes ───────────────────────────────────────

/**
 * Standard successful API response wrapper.
 * All controllers should return this shape.
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

/**
 * Standard error API response.
 * Used by HttpExceptionFilter to format all errors.
 */
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

// ─── Conversation Types ────────────────────────────────────────

/** A single message in the conversation history */
export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

/** Supported messaging channels */
export type Channel = 'web' | 'facebook' | 'zalo' | 'api';

// ─── AI Agent Types ────────────────────────────────────────────

/** Result from intent detection node */
export interface IntentResult {
  name: string;
  confidence: number;
}

/** How deep the reasoning engine should think */
export type ReasoningLevel = 'shallow' | 'medium' | 'deep';

/** Whether the agent produced a final answer or needs more info */
export type AgentResponseType = 'final_answer' | 'ask_clarification';

/** What kind of clarification is pending */
export type ClarificationType = 'intent' | 'missing_info';

/** A single message in the final packaged response */
export interface FinalMessage {
  type: 'text';
  content: string;
}

/** Metadata about a retrieved knowledge source */
export interface RetrievedSource {
  source_id: string;
  title: string;
}
```

### Task 2.2: Verify
- [ ] File has zero `any` types.
- [ ] All types are exported as named exports.
- [ ] `npm run build` passes with no errors.

---

## Phase 3: Constants (`constants/index.ts`)
**Estimated Time:** 10 minutes

### Task 3.1: Create `src/common/constants/index.ts`

```typescript
// ─── API ───────────────────────────────────────────────────────

/** Global route prefix applied in main.ts */
export const API_PREFIX = 'api/v1';

// ─── Intent Names ──────────────────────────────────────────────

/**
 * All recognized intent identifiers.
 * Used by intent-detection node and skill-selection node.
 */
export const INTENTS = {
  GENERAL_FAQ: 'general_faq',
  TUITION_INQUIRY: 'tuition_inquiry',
  MAJOR_INQUIRY: 'major_inquiry',
  MAJOR_CONSULTATION: 'major_consultation',
  SCHOLARSHIP_INQUIRY: 'scholarship_inquiry',
  ADMISSION_METHOD_INQUIRY: 'admission_method_inquiry',
  DEADLINE_INQUIRY: 'deadline_inquiry',
  HUMAN_SUPPORT_REQUEST: 'human_support_request',
  UNKNOWN: 'unknown',
} as const;

// ─── Skill Names ───────────────────────────────────────────────

/**
 * All skill identifiers.
 * Mapped 1:1 from intents via the skill-selection node.
 */
export const SKILLS = {
  FAQ: 'faq_skill',
  TUITION: 'tuition_explanation_skill',
  MAJOR_INFO: 'major_information_skill',
  CAREER_CONSULTING: 'career_consulting_skill',
  SCHOLARSHIP: 'scholarship_advisory_skill',
  PERSUASION: 'persuasion_skill',
  HUMAN_HANDOFF: 'human_handoff_skill',
  FALLBACK: 'fallback_skill',
} as const;

// ─── Error Codes ───────────────────────────────────────────────

/**
 * Standardized error codes returned in API error responses.
 * Must match the contract in api_flow.md.
 */
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AI_SERVICE_ERROR: 'AI_SERVICE_ERROR',
  UNSUPPORTED_CHANNEL: 'UNSUPPORTED_CHANNEL',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

// ─── Input Guard ───────────────────────────────────────────────

/** Limits enforced by the input-guard node */
export const INPUT_GUARD = {
  MAX_MESSAGE_LENGTH: 2000,
  MIN_MESSAGE_LENGTH: 1,
} as const;
```

### Task 3.2: Verify
- [ ] All constants use `as const`.
- [ ] `npm run build` passes.

---

## Phase 4: HTTP Exception Filter (`filters/http-exception.filter.ts`)
**Estimated Time:** 20 minutes

### Task 4.1: Create `src/common/filters/http-exception.filter.ts`

```typescript
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiErrorResponse } from '../types';
import { ERROR_CODES } from '../constants';

/**
 * Global exception filter.
 * Catches ALL thrown exceptions and formats them
 * into the standardized ApiErrorResponse shape.
 *
 * Internal details (stack traces, class names) are
 * never leaked to the client.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let errorCode: string;
    let errorMessage: string;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // class-validator returns { message: string[] } on validation failure
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as Record<string, unknown>;
        errorMessage = Array.isArray(responseObj.message)
          ? responseObj.message.join('; ')
          : String(responseObj.message || exception.message);
      } else {
        errorMessage = String(exceptionResponse);
      }

      errorCode = this.mapStatusToCode(status);
    } else {
      // Unhandled / unknown error — never expose internals
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      errorCode = ERROR_CODES.INTERNAL_ERROR;
      errorMessage = 'An unexpected error occurred';
    }

    // Log full error details internally
    this.logger.error(
      `${request.method} ${request.url} → ${status} [${errorCode}]`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    const body: ApiErrorResponse = {
      error: {
        code: errorCode,
        message: errorMessage,
      },
    };

    response.status(status).json(body);
  }

  /**
   * Maps an HTTP status code to our application error code.
   */
  private mapStatusToCode(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return ERROR_CODES.VALIDATION_ERROR;
      case HttpStatus.INTERNAL_SERVER_ERROR:
        return ERROR_CODES.INTERNAL_ERROR;
      default:
        return ERROR_CODES.INTERNAL_ERROR;
    }
  }
}
```

### Task 4.2: Verify
- [ ] `npm run build` passes.
- [ ] Throwing `new BadRequestException('test')` in any controller returns:
  ```json
  { "error": { "code": "VALIDATION_ERROR", "message": "test" } }
  ```
- [ ] Throwing `new Error('crash')` returns:
  ```json
  { "error": { "code": "INTERNAL_ERROR", "message": "An unexpected error occurred" } }
  ```
- [ ] The server console shows the full stack trace.

---

## Phase 5: Logging Interceptor (`interceptors/logging.interceptor.ts`)
**Estimated Time:** 15 minutes

### Task 5.1: Create `src/common/interceptors/logging.interceptor.ts`

```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

/**
 * Logs every HTTP request/response with latency.
 *
 * Format: [HTTP] POST /api/v1/ai/chat → 200 (185ms)
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url } = request;
    const startTime = Date.now();

    this.logger.log(`→ ${method} ${url}`);

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse<Response>();
        const latency = Date.now() - startTime;
        this.logger.log(
          `← ${method} ${url} → ${response.statusCode} (${latency}ms)`,
        );
      }),
    );
  }
}
```

### Task 5.2: Verify
- [ ] `npm run build` passes.
- [ ] When hitting any endpoint, the console shows the incoming and outgoing logs.

---

## Phase 6: Register Globally in `main.ts`
**Estimated Time:** 5 minutes

### Task 6.1: Update `src/main.ts`

Add the following to the `bootstrap()` function:

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { API_PREFIX } from './common/constants';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Set global route prefix: /api/v1/...
  app.setGlobalPrefix(API_PREFIX);

  // Enable class-validator DTO validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,       // Strip unknown properties
      forbidNonWhitelisted: true, // Throw on unknown properties
      transform: true,       // Auto-transform payloads to DTO instances
    }),
  );

  // Register global error filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Register global logging interceptor
  app.useGlobalInterceptors(new LoggingInterceptor());

  const port = process.env.PORT || 3000;
  await app.listen(port);
}
bootstrap();
```

### Task 6.2: Verify
- [ ] `npm run start:dev` works.
- [ ] `GET http://localhost:3000/api/v1/` (any route) shows logs in console.
- [ ] Invalid requests return the standardized error JSON.

---

## Phase 7: Smoke Test
**Estimated Time:** 5 minutes

### Task 7.1: Manual test with curl

```bash
# 1. Health check (should return 404 since health module isn't built yet)
#    but the error filter should catch it and return standardized JSON.
curl http://localhost:3000/api/v1/anything

# Expected:
# { "error": { "code": "INTERNAL_ERROR", "message": "Cannot GET /api/v1/anything" } }
# Console should show:
# [HTTP] → GET /api/v1/anything
# [HttpExceptionFilter] GET /api/v1/anything → 404 [INTERNAL_ERROR]
```

### Task 7.2: Verify all acceptance criteria

- [ ] `HttpExceptionFilter` catches all exceptions → standardized error JSON.
- [ ] `LoggingInterceptor` logs method, URL, status code, and latency.
- [ ] All shared types exported from `common/types/index.ts`.
- [ ] All constants exported from `common/constants/index.ts`.
- [ ] No `any` types in any file.
- [ ] `npm run build` passes with zero TypeScript errors.

---

## Summary: Execution Order

```text
Phase 1  →  Create folders            (2 min)
Phase 2  →  types/index.ts            (15 min)
Phase 3  →  constants/index.ts        (10 min)
Phase 4  →  http-exception.filter.ts  (20 min)
Phase 5  →  logging.interceptor.ts    (15 min)
Phase 6  →  Register in main.ts       (5 min)
Phase 7  →  Smoke test                (5 min)
─────────────────────────────────────────────
Total                                 ~72 min
```

> **Next module after completion:** `config/` (Module 02)
