import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common'
import { Response, Request } from 'express'

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    //getting status and message from exception
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR

    //what is structure of HttpException?
    const exceptionResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server is error'

    //get message from exception we throw from specifical function (eg
    const message =
      typeof exceptionResponse === 'object'
        ? (exceptionResponse as any).message || (exceptionResponse as any).error
        : exceptionResponse

    //logging
    console.log(`Error on ${request.method} ${request.url}`)
    console.log(exception.stack)

    //shape of error response need to like ApiErrorResponse interface
    response.status(status).json({
      success: false,
      error: {
        code: (exception as any).code || status.toString(),
        message: Array.isArray(message) ? message[0] : message,
        path: request.url,
      },
    })
  }
}
