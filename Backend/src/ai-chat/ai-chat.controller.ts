import { Body, Controller, Post } from '@nestjs/common'
import { ChatResponseDto } from './dto/chat-response.dto'
import { AiChatService } from './ai-chat.service'
import { ChatRequestDto } from './dto/chat-request.dto'
import { Logger } from '@nestjs/common'
@Controller('ai-chat')
export class AiChatController {
  constructor(private readonly aiChatService: AiChatService) {}
  @Post('/test-chatbot')
  async testChatbot(@Body() request: ChatRequestDto): Promise<ChatResponseDto> {
    return this.aiChatService.processMessage(request)
  }
}
