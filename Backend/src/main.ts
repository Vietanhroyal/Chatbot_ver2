import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { API_PREFIX } from './common/constants'
import { ValidationPipe } from '@nestjs/common'
import { LoggingInterceptor } from './common/interceptors/logging.interceptor'
import { HttpExceptionFilter } from './common/filters/http-exception.filter'

async function bootstrap() {
  const PORT = 3000
  const app = await NestFactory.create(AppModule)

  // Apply a global prefix to every route, such as /api/v1.
  // This keeps backend API routes versioned and easy to identify.
  app.setGlobalPrefix(API_PREFIX)

  // Enable global request validation for DTOs.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Remove properties that are not defined in the DTO.
      forbidNonWhitelisted: true, // Throw a validation error when unknown properties are sent.
      transform: true, // Convert request payloads into DTO class instances.
    }),
  )

  // Register the global exception filter for consistent error responses.
  app.useGlobalFilters(new HttpExceptionFilter())

  // Register the global logging interceptor for HTTP request/response logs.
  app.useGlobalInterceptors(new LoggingInterceptor())

  // Start the HTTP server.
  await app.listen(PORT ?? 3000)
  // Log the port used by the server.
  console.log(`Application is running on port ${PORT ?? 3000}`)
}
bootstrap()
