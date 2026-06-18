import { Injectable, Logger } from '@nestjs/common'

interface ValidationResult {
  isValid: boolean
  reason?: string
  sanitizedContent?: string
}

@Injectable()
export class OutputValidatorService {
  private readonly logger = new Logger(OutputValidatorService.name)

  private readonly BLOCKED_PATTERNS = [
    /system\s*prompt\s*[:=]/i,
    /you\s+are\s+a\s+(large\s+language\s+model|chatbot|AI)/i,
    /my\s+instructions?\s+(are|say)/i,
    /I\s+was\s+(told|instructed|programmed)\s+to/i,
    /sk-[a-zA-Z0-9]{20,}/,
    /api[_-]?key\s*[:=]/i,
    /password\s*[:=]/i,
  ]

  validate(content: string): ValidationResult {
    for (const pattern of this.BLOCKED_PATTERNS) {
      if (pattern.test(content)) {
        this.logger.warn({
          event: 'output_blocked',
          pattern: pattern.toString(),
          content_preview: content.substring(0, 100),
        })

        return {
          isValid: false,
          reason: `Output contains blocked pattern: ${pattern}`,
          sanitizedContent: 'Xin lỗi, mình không thể cung cấp thông tin này.',
        }
      }
    }

    const MAX_LENGTH = 2000
    if (content.length > MAX_LENGTH) {
      return {
        isValid: true,
        sanitizedContent: content.substring(0, MAX_LENGTH) + '...',
      }
    }

    return { isValid: true }
  }

  validateMessages(messages: Array<{ type: 'text'; content: string }>) {
    return messages.map(m => {
      const result = this.validate(m.content)

      if (!result.isValid) {
        return { type: 'text' as const, content: result.sanitizedContent! }
      }

      if (result.sanitizedContent && result.sanitizedContent !== m.content) {
        return { type: 'text' as const, content: result.sanitizedContent }
      }

      return m
    })
  }
}
