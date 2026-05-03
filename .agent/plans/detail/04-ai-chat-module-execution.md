# Detailed Execution Plan: `ai-chat/` Module

## Pre-requisites
- [ ] `common/` module is complete (types, constants, filter, interceptor)
- [ ] `config/` module is complete (AppConfigService available)
- [ ] `health/` module is complete (proves NestJS is wired correctly)
- [ ] `npm install class-validator class-transformer` done
- [ ] `npm run build` passes

---

## Phase 1: Create Folder Structure
**Estimated Time:** 1 minute

```text
src/
└── ai-chat/
    ├── ai-chat.module.ts
    ├── ai-chat.controller.ts
    ├── ai-chat.service.ts
    └── dto/
        ├── chat-request.dto.ts
        └── chat-response.dto.ts
```

---

## Phase 2: Install Dependencies
**Estimated Time:** 1 minute

```bash
npm install class-validator class-transformer
```

---

## Phase 3: Chat Request DTO (`dto/chat-request.dto.ts`)
**Estimated Time:** 15 minutes
**Why first:** Controller and service depend on this shape.

### Task 3.1: Create `src/ai-chat/dto/chat-request.dto.ts`

```typescript
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  ValidateNested,
  IsArray,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { INPUT_GUARD } from '../../common/constants';

/**
 * Represents a single message in conversation history.
 */
class ConversationMessageDto {
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @IsString()
  @IsNotEmpty()
  content: string;
}

/**
 * Optional context attached to the chat request.
 */
class ChatContextDto {
  @IsOptional()
  @IsString()
  user_name?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConversationMessageDto)
  conversation_history?: ConversationMessageDto[];
}

/**
 * Input validation for POST /api/v1/ai/chat
 * Contract defined in api_flow.md § 1.2 and § 1.3
 */
export class ChatRequestDto {
  @IsString()
  @IsNotEmpty()
  session_id: string;

  @IsOptional()
  @IsString()
  user_id?: string;

  @IsIn(['web', 'facebook', 'zalo', 'api'])
  channel: 'web' | 'facebook' | 'zalo' | 'api';

  @IsString()
  @IsNotEmpty()
  @MaxLength(INPUT_GUARD.MAX_MESSAGE_LENGTH)
  message: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ChatContextDto)
  context?: ChatContextDto;
}
```

### Task 3.2: Verify
- [ ] `npm run build` passes.
- [ ] No `any` types.

---

## Phase 4: Chat Response DTO (`dto/chat-response.dto.ts`)
**Estimated Time:** 10 minutes

### Task 4.1: Create `src/ai-chat/dto/chat-response.dto.ts`

```typescript
import { ReasoningLevel } from '../../common/types';

/**
 * Output shape for POST /api/v1/ai/chat
 * Contract defined in api_flow.md § 1.4 and § 1.5
 */
export class ChatResponseDto {
  session_id: string;

  intent: {
    name: string;
    confidence: number;
  };

  skill: {
    name: string;
  };

  reasoning: {
    level: ReasoningLevel;
    need_more_info: boolean;
    strategy: string;
  };

  messages: Array<{
    type: 'text';
    content: string;
  }>;

  metadata?: {
    retrieved_sources?: Array<{
      source_id: string;
      title: string;
    }>;
    latency_ms?: number;
    model?: string;
  };
}
```

### Task 4.2: Verify
- [ ] `npm run build` passes.
- [ ] Uses `ReasoningLevel` from `common/types`.

---

## Phase 5: AI Chat Service (`ai-chat.service.ts`)
**Estimated Time:** 20 minutes

### Task 5.1: Create `src/ai-chat/ai-chat.service.ts`

> **Important:** In Sprint 1, the `AiAgentService` does not exist yet.
> We create a **stub** that returns a hardcoded response so we can
> test the full HTTP flow end-to-end. The real agent call is wired in Sprint 2.

```typescript
import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ChatRequestDto } from './dto/chat-request.dto';
import { ChatResponseDto } from './dto/chat-response.dto';
import { ERROR_CODES } from '../common/constants';

/**
 * Orchestrates the chat flow:
 * 1. Map DTO → AgentState
 * 2. Invoke AI Agent (stubbed for Sprint 1)
 * 3. Map AgentState → ResponseDTO
 * 4. Log metrics
 */
@Injectable()
export class AiChatService {
  private readonly logger = new Logger(AiChatService.name);

  // TODO: Inject AiAgentService when ai-agent module is built (Sprint 2)
  // constructor(private readonly aiAgentService: AiAgentService) {}

  async processMessage(request: ChatRequestDto): Promise<ChatResponseDto> {
    const startTime = Date.now();

    try {
      this.logger.log(`Processing message for session: ${request.session_id}`);

      // ── Sprint 1: Stub response ──────────────────────────────
      // Replace this block with actual agent invocation in Sprint 2:
      // const initialState = this.mapDtoToState(request);
      // const finalState = await this.aiAgentService.invoke(initialState);
      // return this.mapStateToDto(finalState, startTime);

      const latency = Date.now() - startTime;

      const response: ChatResponseDto = {
        session_id: request.session_id,
        intent: {
          name: 'unknown',
          confidence: 0,
        },
        skill: {
          name: 'fallback_skill',
        },
        reasoning: {
          level: 'shallow',
          need_more_info: false,
          strategy: 'stub_response',
        },
        messages: [
          {
            type: 'text',
            content: `[Stub] Received your message: "${request.message}". AI Agent not connected yet.`,
          },
        ],
        metadata: {
          latency_ms: latency,
          model: 'stub',
        },
      };

      this.logger.log(
        `Response generated for session ${request.session_id} in ${latency}ms`,
      );

      return response;
    } catch (error) {
      this.logger.error('Failed to process message', error);
      throw new HttpException(
        {
          code: ERROR_CODES.AI_SERVICE_ERROR,
          message: 'Failed to generate AI response',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
```

### Task 5.2: Verify
- [ ] `npm run build` passes.
- [ ] Stub response matches `ChatResponseDto` shape.

---

## Phase 6: AI Chat Controller (`ai-chat.controller.ts`)
**Estimated Time:** 5 minutes

### Task 6.1: Create `src/ai-chat/ai-chat.controller.ts`

```typescript
import { Controller, Post, Body } from '@nestjs/common';
import { AiChatService } from './ai-chat.service';
import { ChatRequestDto } from './dto/chat-request.dto';
import { ChatResponseDto } from './dto/chat-response.dto';

/**
 * Handles POST /api/v1/ai/chat
 *
 * This is the ONLY main API endpoint for the MVP.
 * Receives user messages, invokes the AI reasoning pipeline,
 * and returns structured multi-message responses.
 */
@Controller('ai/chat')
export class AiChatController {
  constructor(private readonly aiChatService: AiChatService) {}

  @Post()
  async handleChat(
    @Body() requestDto: ChatRequestDto,
  ): Promise<ChatResponseDto> {
    return this.aiChatService.processMessage(requestDto);
  }
}
```

### Task 6.2: Verify
- [ ] `npm run build` passes.

---

## Phase 7: AI Chat Module (`ai-chat.module.ts`)
**Estimated Time:** 3 minutes

### Task 7.1: Create `src/ai-chat/ai-chat.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { AiChatController } from './ai-chat.controller';
import { AiChatService } from './ai-chat.service';

@Module({
  controllers: [AiChatController],
  providers: [AiChatService],
})
export class AiChatModule {}
```

---

## Phase 8: Register in `app.module.ts`
**Estimated Time:** 2 minutes

### Task 8.1: Update `src/app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { HealthModule } from './health/health.module';
import { AiChatModule } from './ai-chat/ai-chat.module';

@Module({
  imports: [
    AppConfigModule,
    HealthModule,
    AiChatModule,
  ],
})
export class AppModule {}
```

---

## Phase 9: Smoke Test
**Estimated Time:** 10 minutes

### Task 9.1: Test valid request

```bash
curl -X POST http://localhost:3000/api/v1/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "test_001",
    "channel": "web",
    "message": "Học phí ngành CNTT bao nhiêu?"
  }'
```

**Expected Response (HTTP 201):**
```json
{
  "session_id": "test_001",
  "intent": { "name": "unknown", "confidence": 0 },
  "skill": { "name": "fallback_skill" },
  "reasoning": { "level": "shallow", "need_more_info": false, "strategy": "stub_response" },
  "messages": [
    { "type": "text", "content": "[Stub] Received your message: \"Học phí ngành CNTT bao nhiêu?\". AI Agent not connected yet." }
  ],
  "metadata": { "latency_ms": 2, "model": "stub" }
}
```

### Task 9.2: Test validation — missing `message`

```bash
curl -X POST http://localhost:3000/api/v1/ai/chat \
  -H "Content-Type: application/json" \
  -d '{ "session_id": "test_001", "channel": "web" }'
```

**Expected Response (HTTP 400):**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "message should not be empty; message must be a string"
  }
}
```

### Task 9.3: Test validation — invalid channel

```bash
curl -X POST http://localhost:3000/api/v1/ai/chat \
  -H "Content-Type: application/json" \
  -d '{ "session_id": "test_001", "channel": "telegram", "message": "Hello" }'
```

**Expected Response (HTTP 400):**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "channel must be one of the following values: web, facebook, zalo, api"
  }
}
```

### Task 9.4: Test validation — message too long (>2000 chars)

```bash
# Generate a 2001-character message and send it
# Expected: 400 with MaxLength validation error
```

### Task 9.5: Verify all acceptance criteria
- [ ] Valid request returns the stub response with correct JSON structure.
- [ ] Missing `session_id` → 400 `VALIDATION_ERROR`.
- [ ] Missing `message` → 400 `VALIDATION_ERROR`.
- [ ] Invalid `channel` → 400 `VALIDATION_ERROR`.
- [ ] Message > 2000 chars → 400 `VALIDATION_ERROR`.
- [ ] Unknown extra fields are stripped (whitelist: true).
- [ ] LoggingInterceptor shows latency in console.
- [ ] HttpExceptionFilter formats all errors correctly.
- [ ] `npm run build` passes with zero errors.

---

## Summary

```text
Phase 1  →  Create folders              (1 min)
Phase 2  →  Install class-validator      (1 min)
Phase 3  →  chat-request.dto.ts          (15 min)
Phase 4  →  chat-response.dto.ts         (10 min)
Phase 5  →  ai-chat.service.ts (stub)    (20 min)
Phase 6  →  ai-chat.controller.ts        (5 min)
Phase 7  →  ai-chat.module.ts            (3 min)
Phase 8  →  Register in app.module.ts    (2 min)
Phase 9  →  Smoke tests (4 curl tests)   (10 min)
──────────────────────────────────────────────────
Total                                    ~67 min
```

> **Next module:** `knowledge-base/` (Module 07)
