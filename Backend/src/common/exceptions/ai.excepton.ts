import { HttpException, HttpStatus } from '@nestjs/common'

export class BaseException extends HttpException {
  constructor(
    public readonly code: string,
    public readonly message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super({ code, message }, status)
  }
}

export class AiServiceException extends BaseException {
  constructor(detailMessage?: string) {
    super(
      'AI_SERVICE_ERROR',
      detailMessage || 'Fail to process AI response',
      HttpStatus.INTERNAL_SERVER_ERROR,
    )
  }
}
