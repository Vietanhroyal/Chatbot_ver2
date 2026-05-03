# Module 04: `ai-chat/` — API Gateway Layer

## Overview
The `ai-chat/` module is the HTTP entry point for the AI Reasoning Core. It handles request validation using DTOs, orchestrates the call to the LangGraph `ai-agent` service, and formats the final JSON response. It does **not** contain AI reasoning logic.

## Dependencies
- `class-validator` (For strict DTO validation)
- `class-transformer` (For DTO payload transformation)
- `ai-agent/` module (Invokes the graph)
- `logging/` module (Optional for MVP, records metrics)

## Priority: **High** (Sprint 1)

---

## File 1: `src/ai-chat/dto/chat-request.dto.ts`

### Purpose
Strictly defines and validates the incoming POST payload.

### Requirements
- Use `class-validator` decorators (`@IsString`, `@IsNotEmpty`, `@IsOptional`, etc.).
- Match the structure defined in `api_flow.md`.

### Code Pattern
```typescript
import { IsString, IsNotEmpty, IsOptional, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class MessageDto {
  @IsEnum(['user', 'assistant'])
  role: 'user' | 'assistant';

  @IsString()
  @IsNotEmpty()
  content: string;
}

class ContextDto {
  @IsOptional()
  @IsString()
  user_name?: string;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => MessageDto)
  conversation_history?: MessageDto[];
}

export class ChatRequestDto {
  @IsString()
  @IsNotEmpty()
  session_id: string;

  @IsOptional()
  @IsString()
  user_id?: string;

  @IsEnum(['web', 'facebook', 'zalo', 'api'])
  channel: 'web' | 'facebook' | 'zalo' | 'api';

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ContextDto)
  context?: ContextDto;
}
```

---

## File 2: `src/ai-chat/dto/chat-response.dto.ts`

### Purpose
Defines the output shape. While not strictly validated by NestJS on output by default, having the class helps with Swagger documentation and type safety within the controller.

### Requirements
- Match the response body defined in `api_flow.md`.

---

## File 3: `src/ai-chat/ai-chat.controller.ts`

### Purpose
Handles the `POST /api/v1/ai/chat` route.

### Requirements
- Map controller to `ai/chat`.
- Use `@Post()`.
- Inject `AiChatService`.
- Use `@Body()` with `ChatRequestDto`.

### Code Pattern
```typescript
@Controller('ai/chat')
export class AiChatController {
  constructor(private readonly aiChatService: AiChatService) {}

  @Post()
  async handleChat(@Body() requestDto: ChatRequestDto): Promise<ChatResponseDto> {
    return this.aiChatService.processMessage(requestDto);
  }
}
```

---

## File 4: `src/ai-chat/ai-chat.service.ts`

### Purpose
The orchestrator. It takes the validated DTO, transforms it into the `AgentState` expected by LangGraph, calls the agent, calculates metrics (latency), logs the interaction, and returns the DTO.

### Requirements
- Inject `AiAgentService` and `LoggingService`.
- Map `ChatRequestDto` to `AgentState`.
- Await `aiAgentService.invoke(state)`.
- Format the final graph state back into `ChatResponseDto`.
- Handle potential errors from the graph gracefully (throw custom `HttpException` if AI fails).

### Implementation Steps
1. Start timer.
2. Construct initial `AgentState` from DTO.
3. Call `const finalState = await this.aiAgentService.invoke(initialState)`.
4. End timer, calculate latency.
5. Construct `ChatResponseDto` from `finalState`.
6. Fire-and-forget log call: `this.loggingService.logInteraction(...)`.
7. Return response.

---

## Acceptance Criteria
- [ ] Validation pipe automatically rejects requests missing `session_id` or `message` with 400 Bad Request.
- [ ] Service correctly maps DTO to AgentState.
- [ ] Controller returns the exact JSON structure defined in API docs.

## Testing Notes
- Send requests with missing fields, invalid channels, or wrong types to verify `class-validator` catches them.
- Stub the `AiAgentService` to immediately return a dummy state to test mapping logic.
