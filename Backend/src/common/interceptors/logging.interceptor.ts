import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import { Observable } from 'rxjs'

// common/interceptors/logging.interceptor.ts

@Injectable()
export class LoggingInterceptor implements NestInterceptor<any, any> {

    // this function will be called before the controller method is executed
    //it recive the context 
    //context is provide postition request in system, and also provide a next object
    intercept(context: ExecutionContext, next: CallHandler<any>): Observable<any> | Promise<Observable<any>> {

        return next.handle(); //next hendller return the controller response , that response type is what we want to log
        //return next.handle(); 
        
    }
}


