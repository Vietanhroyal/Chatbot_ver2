# Module 01: `common/` — Shared Utilities & Cross-Cutting Concerns

## Overview
The `common/` module contains reusable infrastructure code that is shared across all other modules. It does **not** contain business logic — only cross-cutting concerns like error handling, request logging, shared types, and constants.

## Dependencies
- `@nestjs/common` (NestJS core decorators & interfaces)
- `@nestjs/core` (HttpAdapterHost for exception filter)
- No external packages needed

## Priority: **High** (Sprint 1 — must be built first, other modules depend on it)

---

## File 1: `src/common/filters/http-exception.filter.ts`

### Purpose
Global error handler that catches all `HttpException` instances and formats them into the standard API response shape.

### Requirements
- Implement `ExceptionFilter` from `@nestjs/common`.
- Catch all `HttpException` and unhandled errors.
- Return the standard error response format:
  ```json
  {
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "message is required"
    }
  }
  ```
- **Never expose internal error details** (stack traces, internal messages) to the client.
- Log the full error internally (console for MVP).
- Map known error codes: `VALIDATION_ERROR`, `AI_SERVICE_ERROR`, `UNSUPPORTED_CHANNEL`, `INTERNAL_ERROR`.

### Implementation Steps
1. Create the class `HttpExceptionFilter` implementing `ExceptionFilter`.
2. Use `@Catch()` decorator (catches all exceptions).
3. Extract status code and response from the exception.
4. Format output using the standard error shape from `api_flow.md`.
5. Add a catch-all for non-HttpException errors (return 500 with `INTERNAL_ERROR` code).
6. Log the full error (including stack trace) to `console.error`.

### Code Pattern
```typescript
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    // Extract HTTP context
    // Determine status code
    // Format standardized error response
    // Log full error internally
    // Send response
  }
}
```

### Registration
- Register globally in `main.ts` using `app.useGlobalFilters(new HttpExceptionFilter())`.

---

## File 2: `src/common/interceptors/logging.interceptor.ts`

### Purpose
Logs every incoming HTTP request and its response, tracking latency.

### Requirements
- Implement `NestInterceptor` from `@nestjs/common`.
- Log on request entry: method, URL, timestamp.
- Log on response exit: method, URL, status code, latency (ms).
- Use `tap` operator from `rxjs` to observe the response without modifying it.
- Keep log format consistent and parseable.

### Implementation Steps
1. Create `LoggingInterceptor` implementing `NestInterceptor`.
2. Use `@Injectable()` decorator.
3. In `intercept()`, capture `Date.now()` before the handler.
4. Use `pipe(tap())` to log after the response is sent.
5. Log format: `[HTTP] POST /api/v1/ai/chat → 200 (185ms)`.

### Code Pattern
```typescript
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const latency = Date.now() - startTime;
        this.logger.log(`${method} ${url} → ${response.statusCode} (${latency}ms)`);
      }),
    );
  }
}
```

### Registration
- Register globally in `main.ts` using `app.useGlobalInterceptors(new LoggingInterceptor())`.

---

## File 3: `src/common/types/index.ts`

### Purpose
Central location for shared TypeScript interfaces and types used across multiple modules.

### Types to Define

```typescript
// Standard API response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

// Standard error response
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

// Conversation message shape (used in state & DTOs)
export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// Channel types
export type Channel = 'web' | 'facebook' | 'zalo' | 'api';

// Intent result
export interface IntentResult {
  name: string;
  confidence: number;
}

// Reasoning level
export type ReasoningLevel = 'shallow' | 'medium' | 'deep';

// Response type from agent
export type AgentResponseType = 'final_answer' | 'ask_clarification';

// Clarification type
export type ClarificationType = 'intent' | 'missing_info';

// Final message shape
export interface FinalMessage {
  type: 'text';
  content: string;
}

// Retrieved source metadata
export interface RetrievedSource {
  source_id: string;
  title: string;
}
```

### Rules
- No `any` types.
- Export all types as named exports.
- Keep this file purely declarative (no logic, no classes).

---

## File 4: `src/common/constants/index.ts`

### Purpose
App-wide constants — magic strings, enum-like values, and configuration defaults.

### Constants to Define

```typescript
// API versioning
export const API_PREFIX = 'api/v1';

// Intent names
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

// Skill names
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

// Error codes
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AI_SERVICE_ERROR: 'AI_SERVICE_ERROR',
  UNSUPPORTED_CHANNEL: 'UNSUPPORTED_CHANNEL',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

// Input guard limits
export const INPUT_GUARD = {
  MAX_MESSAGE_LENGTH: 2000,
  MIN_MESSAGE_LENGTH: 1,
} as const;
```

### Rules
- Use `as const` for type safety.
- Group related constants into objects.
- No computed values — only literal constants.

---

## Acceptance Criteria
- [ ] `HttpExceptionFilter` catches all exceptions and returns standardized error JSON.
- [ ] `LoggingInterceptor` logs method, URL, status code, and latency for every request.
- [ ] All shared types are exported from `common/types/index.ts`.
- [ ] All constants are exported from `common/constants/index.ts`.
- [ ] No `any` types anywhere in the module.
- [ ] Both filter and interceptor are registered globally in `main.ts`.

## Testing Notes
- Test the filter by throwing various `HttpException` types and verifying the response shape.
- Test the interceptor by verifying logs appear on request/response.
- Types and constants are purely declarative — no unit tests needed.
