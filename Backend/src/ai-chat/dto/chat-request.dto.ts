//ConversationMessage DTO

import { Type } from 'class-transformer'
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator'

export class ConversationMessageDto {
  @IsIn(['user', 'assistant'])
  @IsNotEmpty() // newsessary ?
  role: 'user' | 'assistant'

  @IsString()
  @IsNotEmpty()
  message: string
}

//Chatcontext  DTO
export class ChatbotContext {
  @IsOptional()
  @IsString()
  user_name?: string

  @IsOptional() // if not present will be undefined -> validate it will be skipped
  @IsArray()
  @ValidateNested({ each: true }) // deep validate ensure that each propoties of object in array is matching with conversationMessageDto
  @Type(() => ConversationMessageDto) //convert Json to ConversationMessageDto instance
  converstionHistory?: ConversationMessageDto[]
}

//this is class dto for full chatReques come to my server backend
export class ChatRequestDto {
  @IsString()
  @IsNotEmpty()
  session_id: string //session from web or fb or zalo

  @IsString()
  @IsNotEmpty()
  user_id: string

  @IsString()
  @IsNotEmpty()
  @IsIn(['facebook', 'zalo', 'web'])
  channel: 'facebook' | 'zalo' | 'web'

  @IsString()
  @IsNotEmpty()
  message: string

  @IsOptional()
  @ValidateNested()
  @Type(() => ChatbotContext)
  context: ChatRequestDto
}
