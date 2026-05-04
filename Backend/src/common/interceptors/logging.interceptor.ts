import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common'
import { Observable, tap } from 'rxjs'
import { Response, Request } from 'express'
// common/interceptors/logging.interceptor.ts

@Injectable()
export class LoggingInterceptor implements NestInterceptor<any, any> {
  private logger = new Logger('HTTP')

  // this function will be called before the controller method is executed
  //it recive the context
  //context is provide postition request in system, and also provide a next object
  intercept(
    context: ExecutionContext,
    next: CallHandler<any>,
  ): Observable<any> | Promise<Observable<any>> {
    //in here we can do 4 thing
    //1. get the request data before it sended to controller method
    const request = context.switchToHttp().getRequest<Request>()
    const { method, url, body } = request
    const now = Date.now()

    return next.handle().pipe(
      tap(data => {
        // tap is a function that allows us to do anything with data before that send to client
        //2. get the response data after it sended from controller to client
        const delay = Date.now() - now
        const response = context.switchToHttp().getResponse<Response>()
        const statusCode = response.statusCode

        //3. log the request data, response data, status ..... anything in here
        this.logger.log(
          `Method: ${method}, URL: ${url}, Status: ${statusCode}, Response Time: ${delay}ms`,
        )

        //4. in test, development mode. we will log more detail than production mode
        if (process.env.NODE_ENV != 'Production') {
          this.logger.debug(`[Input body] ${JSON.stringify(body)}`)
          this.logger.debug(`[Output data] ${JSON.stringify(data)}`)
        }
      }),
    )
  }
}
