import { Controller, Post, Body } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { AiChatService } from './ai-chat.service'
import { ChatRequestDto } from './dto/chat-request.dto'
import { ChatResponseDto } from './dto/chat-response.dto'

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

  @Throttle({ short: { limit: 20, ttl: 60_000 } })
  @Post()
  async handleChat(
    @Body() requestDto: ChatRequestDto,
  ): Promise<ChatResponseDto> {
    return this.aiChatService.processMessage(requestDto)
  }
}
