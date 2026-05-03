import { ArgumentsHost, ExceptionFilter } from '@nestjs/common'
import { Response, Request } from 'express'

export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    //getting status and message from exception
    const status = 0 || 0

    //get message from exception we throw from specifical function (eg
    const message = 'server is error'

    //shape of error response need to like ApiErrorResponse interface
    response.status(status).json({
      success: false,
      error: {
        code: status.toString(),
        message:
          typeof message === 'string' ? message : (message as any).message,
        path: request.url,
      },
    })
  }
}
