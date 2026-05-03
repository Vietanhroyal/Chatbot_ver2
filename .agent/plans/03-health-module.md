# Module 03: `health/` — Health Check

## Overview
A simple module to provide a standard health check endpoint. Useful for load balancers, Docker, or monitoring tools to verify the API is running.

## Dependencies
- `@nestjs/common`
- `@nestjs/terminus` (Optional, but good for future database health checks)

## Priority: **Medium** (Sprint 1 — good for quick verifications)

---

## File 1: `src/health/health.controller.ts`

### Purpose
Expose the `GET /api/v1/health` endpoint.

### Requirements
- Controller mapped to `health`.
- Provide a simple GET route.
- Follow the API contract defined in `api_flow.md`.

### Code Pattern
```typescript
@Controller('health')
export class HealthController {
  constructor(private healthService: HealthService) {}

  @Get()
  check() {
    return this.healthService.getHealthStatus();
  }
}
```

---

## File 2: `src/health/health.service.ts`

### Purpose
Perform the actual health check logic.

### Requirements
- Return an object with `status: "ok"`, service name, and timestamp.
- In future phases, this is where DB connection checks would go.

### Code Pattern
```typescript
@Injectable()
export class HealthService {
  getHealthStatus() {
    return {
      status: 'ok',
      service: 'ai-chatbot-api',
      timestamp: new Date().toISOString(),
    };
  }
}
```

---

## Acceptance Criteria
- [ ] `GET /api/v1/health` returns HTTP 200.
- [ ] Response matches the exact JSON shape specified in the plan.
- [ ] Integrated into `app.module.ts`.
