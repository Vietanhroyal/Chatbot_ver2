# Detailed Execution Plan: `health/` Module

## Pre-requisites
- [ ] `common/` module is complete
- [ ] `config/` module is complete
- [ ] `npm run build` passes

---

## Phase 1: Create Folder Structure
**Estimated Time:** 1 minute

```text
src/
└── health/
    ├── health.module.ts
    ├── health.controller.ts
    └── health.service.ts
```

---

## Phase 2: Health Service (`health.service.ts`)
**Estimated Time:** 5 minutes

### Task 2.1: Create `src/health/health.service.ts`

```typescript
import { Injectable } from '@nestjs/common';

interface HealthCheckResponse {
  status: 'ok' | 'error';
  service: string;
  timestamp: string;
}

/**
 * Health check service.
 * Future phases: Add DB connectivity, OpenAI reachability checks.
 */
@Injectable()
export class HealthService {
  /** Contract defined in api_flow.md § 6.1 */
  getHealthStatus(): HealthCheckResponse {
    return {
      status: 'ok',
      service: 'ai-chatbot-api',
      timestamp: new Date().toISOString(),
    };
  }
}
```

### Task 2.2: Verify
- [ ] `npm run build` passes.

---

## Phase 3: Health Controller (`health.controller.ts`)
**Estimated Time:** 5 minutes

### Task 3.1: Create `src/health/health.controller.ts`

```typescript
import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

/**
 * Exposes GET /api/v1/health
 * Used by Docker HEALTHCHECK, load balancers, and monitoring.
 */
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  check() {
    return this.healthService.getHealthStatus();
  }
}
```

---

## Phase 4: Health Module (`health.module.ts`)
**Estimated Time:** 3 minutes

### Task 4.1: Create `src/health/health.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
```

---

## Phase 5: Register in `app.module.ts`
**Estimated Time:** 2 minutes

### Task 5.1: Update `src/app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    AppConfigModule,
    HealthModule,
  ],
})
export class AppModule {}
```

---

## Phase 6: Smoke Test
**Estimated Time:** 5 minutes

### Task 6.1: Test with curl

```bash
curl http://localhost:3000/api/v1/health
```

### Expected Response (HTTP 200):
```json
{
  "status": "ok",
  "service": "ai-chatbot-api",
  "timestamp": "2026-04-27T10:00:00.000Z"
}
```

### Expected Console Output:
```text
[HTTP] → GET /api/v1/health
[HTTP] ← GET /api/v1/health → 200 (2ms)
```

### Task 6.2: Verify all acceptance criteria
- [ ] `GET /api/v1/health` returns HTTP 200.
- [ ] Response contains `status`, `service`, `timestamp`.
- [ ] LoggingInterceptor shows request/response in console.
- [ ] `npm run build` passes with zero errors.

---

## Summary

```text
Phase 1  →  Create folder          (1 min)
Phase 2  →  health.service.ts      (5 min)
Phase 3  →  health.controller.ts   (5 min)
Phase 4  →  health.module.ts       (3 min)
Phase 5  →  Register in app.module (2 min)
Phase 6  →  Smoke test             (5 min)
────────────────────────────────────────────
Total                              ~21 min
```

> **Next module:** `ai-chat/` (Module 04)
