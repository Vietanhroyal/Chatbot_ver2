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

  @IsOptional()
  pending_clarification?: {
    type: string;
    original_intent?: string;
    original_skill?: string;
    missing_entities?: string[];
    question_asked?: string;
  } | null;
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
