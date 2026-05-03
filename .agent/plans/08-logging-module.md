# Module 08: `logging/` — Analytics and Tracing

## Overview
A centralized service to log system metrics, AI performance (latency, tokens), and conversation history. For the MVP, this just outputs structured JSON to the console. In future phases, it will write to PostgreSQL.

## Dependencies
- `@nestjs/common` (Logger)

## Priority: **Low/Medium** (Sprint 1/3)

---

## File 1: `src/logging/logging.service.ts`

### Purpose
Provides a standard way to track interactions.

### Requirements
- Inject NestJS standard `Logger`.
- Implement `logInteraction(data: InteractionLogDto)`
- Implement `logAiMetrics(data: AiMetricsDto)`

### Code Pattern
```typescript
interface InteractionLog {
  sessionId: string;
  intent: string;
  skill: string;
  latencyMs: number;
  tokensUsed?: number;
}

@Injectable()
export class LoggingService {
  private readonly logger = new Logger('AILogger');

  logInteraction(data: InteractionLog) {
    // MVP: Just console.log a stringified JSON for easy scraping
    this.logger.log(JSON.stringify({
      type: 'interaction',
      timestamp: new Date().toISOString(),
      ...data
    }));
    
    // Future Phase:
    // await this.prisma.log.create({ data })
  }
}
```

---

## Acceptance Criteria
- [ ] Service can be injected into `AiChatService`.
- [ ] Outputs formatted JSON to the server console.
- [ ] Does not block the main request thread (fire and forget).
