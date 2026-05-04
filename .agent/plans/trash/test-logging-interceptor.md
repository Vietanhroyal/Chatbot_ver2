# Plan: Test Logging Interceptor

We need to verify that the `LoggingInterceptor` correctly logs incoming requests, outgoing responses, input bodies, and execution times. We also want to verify it works alongside the newly updated `HttpExceptionFilter`.

## Proposed Changes

### `Backend/src/app.controller.ts`
We will add two new endpoints to the `AppController` to trigger the interceptor and the exception filter:
1. **POST `/test-logging`**: Accepts a JSON body and returns it. This will test the interceptor's ability to log the `[Input body]` and `[Output data]`.
2. **GET `/test-error`**: Throws an `HttpException` (or `BadRequestException`). This will test how the `LoggingInterceptor` and `HttpExceptionFilter` interact.

#### [MODIFY] app.controller.ts
```typescript
import { Controller, Get, Post, Body, BadRequestException } from '@nestjs/common'
import { AppService } from './app.service'

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello()
  }

  @Post('test-logging')
  testLogging(@Body() body: any) {
    return {
      message: 'Logging test successful',
      receivedData: body,
    }
  }

  @Get('test-error')
  testError() {
    throw new BadRequestException('This is a test error to check logging and exception filter')
  }
}
```

## Verification Plan

1. Start the NestJS application locally.
2. Send a POST request to `/api/v1/test-logging` with a JSON payload.
3. Observe the console output to ensure `[Input body]`, `[Output data]`, and the request summary (`POST /api/v1/test-logging 201 - Xms`) are printed via the `Logger`.
4. Send a GET request to `/api/v1/test-error`.
5. Observe the console to ensure the error is handled and logged by the `HttpExceptionFilter`.
